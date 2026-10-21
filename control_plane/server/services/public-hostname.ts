import { and, eq, ne } from 'drizzle-orm'
import type { Database } from '../database'
import { environments } from '../database/schema'
import { accessUrlForEnvironment, assertPublicHostname, canHavePublicHostname, publicOriginForHostname } from '../../shared/utils/public-hostname'
import { relaunchRegisteredEnvironment } from './docker-relaunch'
import { environmentOriginUpdates, publicEnvSettings, patchProvisionedEnvFile } from './provision-env'
import { generateProductionEdgeFilesFromRegistry } from './production-edge-sync'
import { edgeRoot } from './production-edge'
import { autoCertificateEnabled, type CertificateIssuer, type CertificateResult, ensureHostnameCertificate } from './edge-certificate'
import { getRegisteredEnvironment, listRegisteredEnvironments } from './registry'

export class HostnameError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function assignPublicHostname(db: Database, id: string, rawHostname: string, input: {
  filesRoot?: string
  edgeDir?: string
  relaunch?: boolean
  /** Issue a Let's Encrypt certificate when none is installed. Default: on when EDGE_AUTO_CERT is set. */
  certificate?: boolean
  issuer?: CertificateIssuer
} = {}) {
  let hostname: string
  try {
    hostname = assertPublicHostname(rawHostname)
  } catch (error) {
    throw new HostnameError(error instanceof Error ? error.message : 'Invalid hostname.')
  }
  const row = await getRegisteredEnvironment(db, id)
  if (!row) {
    throw new HostnameError('Environment not registered.', 404)
  }
  if (row.lifecycleStatus === 'decommissioned') {
    throw new HostnameError('Decommissioned environments cannot receive a public hostname.', 409)
  }
  if (!canHavePublicHostname(row.type)) {
    throw new HostnameError('Public hostnames are assigned to PROD and DEV environments only.', 409)
  }
  const [taken] = await db.select({ id: environments.id }).from(environments)
    .where(and(eq(environments.publicHostname, hostname), ne(environments.id, id)))
    .limit(1)
  if (taken) {
    throw new HostnameError(`Hostname ${hostname} is already assigned to another environment.`, 409)
  }

  const origin = publicOriginForHostname(hostname)
  const accessUrl = accessUrlForEnvironment({ hostPort: row.hostPort, publicHostname: hostname })
  const settings = publicEnvSettings({
    publicHostname: hostname,
    nodeKind: row.node.kind,
  })
  await db.update(environments).set({
    publicHostname: hostname,
    accessUrl,
  }).where(eq(environments.id, id))

  patchProvisionedEnvFile(row.envFileLocal, {
    NUXT_PUBLIC_ORIGIN: origin,
    SESSION_COOKIE_SECURE: settings.sessionCookieSecure,
    TRUSTED_PROXY_IPS: settings.trustedProxyIps,
    HOST_BIND: settings.hostBind,
  }, input.filesRoot)

  if (row.productInstance.productId === 'sales') {
    const siblings = (await listRegisteredEnvironments(db))
      .filter(item => item.productInstance.id === row.productInstance.id)
    const origins = environmentOriginUpdates(siblings)
    for (const sibling of siblings) {
      if (sibling.lifecycleStatus === 'decommissioned') {
        continue
      }
      if (sibling.type !== 'PROD' && sibling.type !== 'DEV') {
        continue
      }
      patchProvisionedEnvFile(sibling.envFileLocal, origins, input.filesRoot)
    }
  }

  const edgeKind = row.node.kind === 'vps' ? 'vps' : 'laptop'
  let edge = generateProductionEdgeFilesFromRegistry(await listRegisteredEnvironments(db), {
    edgeDir: input.edgeDir,
    kind: edgeKind,
  })

  // The HTTP vhost written above already serves /.well-known/acme-challenge/ for this name.
  // Once the certificate exists, regenerate so nginx adds the 443 server and the redirect.
  let certificate: CertificateResult = { status: 'skipped' }
  if (input.certificate ?? autoCertificateEnabled()) {
    certificate = ensureHostnameCertificate(hostname, input.edgeDir || edgeRoot(), input.issuer)
    if (certificate.status === 'issued') {
      edge = generateProductionEdgeFilesFromRegistry(await listRegisteredEnvironments(db), {
        edgeDir: input.edgeDir,
        kind: edgeKind,
      })
    }
  }

  let relaunch: { slug: string } | null = null
  let relaunchError: string | null = null
  if (input.relaunch !== false && row.lifecycleStatus !== 'provisioning' && row.lifecycleStatus !== 'failed') {
    try {
      relaunch = relaunchRegisteredEnvironment({
        slug: row.slug,
        composeFile: row.composeFile,
        envFileLocal: row.envFileLocal,
        envFileExample: row.envFileExample,
        composeProject: row.composeProject,
        filesRoot: input.filesRoot,
        productInstance: row.productInstance,
      })
    } catch (error) {
      relaunchError = error instanceof Error ? error.message : 'Relaunch failed.'
    }
  }

  return {
    id: row.id,
    hostname,
    publicOrigin: origin,
    accessUrl,
    edge: { written: true, reloaded: edge.reloaded, reason: edge.reason },
    certificate,
    relaunch,
    relaunchError,
  }
}

/**
 * Default hostname under the node's base domain: PROD `{customer-slug}.{domain}`, as with acme.nuxxion.com;
 * DEV `dev-{customer-slug}.{domain}`. A customer's second product gets `…{customer-slug}-{product}.{domain}`.
 * Returns null when no base domain is configured or every candidate is taken or invalid.
 */
export function defaultPublicHostname(input: {
  customerSlug: string
  productId: string
  type?: string
  baseDomain?: string | null
  taken: ReadonlySet<string>
}) {
  const domain = (input.baseDomain || '').trim().toLowerCase().replace(/^\.+|\.+$/g, '')
  if (!domain) {
    return null
  }
  const prefix = input.type === 'DEV' ? 'dev-' : ''
  for (const label of [`${prefix}${input.customerSlug}`, `${prefix}${input.customerSlug}-${input.productId}`]) {
    try {
      const hostname = assertPublicHostname(`${label}.${domain}`)
      if (!input.taken.has(hostname)) {
        return hostname
      }
    } catch {
      // Not a valid DNS label; try the next candidate.
    }
  }
  return null
}

export function publicBaseDomain(env: NodeJS.Dict<string | undefined> = process.env) {
  return (env.PUBLIC_BASE_DOMAIN || '').trim() || null
}

/** Provisioning: give a new PROD or DEV its default hostname. Never throws; a failure leaves the environment on loopback. */
export async function autoAssignPublicHostname(db: Database, row: {
  id: string
  type: string
  publicHostname?: string | null
  customer: { slug: string }
  productInstance: { productId: string }
}, input: { filesRoot?: string, baseDomain?: string | null, edgeDir?: string, certificate?: boolean, issuer?: CertificateIssuer } = {}) {
  if (!canHavePublicHostname(row.type) || row.publicHostname) {
    return null
  }
  const taken = new Set((await listRegisteredEnvironments(db))
    .map(item => item.publicHostname)
    .filter((value): value is string => Boolean(value)))
  const hostname = defaultPublicHostname({
    customerSlug: row.customer.slug,
    productId: row.productInstance.productId,
    type: row.type,
    baseDomain: input.baseDomain === undefined ? publicBaseDomain() : input.baseDomain,
    taken,
  })
  if (!hostname) {
    return null
  }
  try {
    return await assignPublicHostname(db, row.id, hostname, {
      filesRoot: input.filesRoot,
      edgeDir: input.edgeDir,
      relaunch: false,
      certificate: input.certificate,
      issuer: input.issuer,
    })
  } catch (error) {
    return { id: row.id, hostname, error: error instanceof Error ? error.message : 'Hostname assignment failed.' }
  }
}
