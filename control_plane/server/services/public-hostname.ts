import { and, eq, ne } from 'drizzle-orm'
import type { Database } from '../database'
import { environments } from '../database/schema'
import { accessUrlForEnvironment, assertPublicHostname, publicOriginForHostname } from '../../shared/utils/public-hostname'
import { relaunchRegisteredEnvironment } from './docker-relaunch'
import { publicEnvSettings, patchProvisionedEnvFile } from './provision-env'
import { generateProductionEdgeFilesFromRegistry } from './production-edge-sync'
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
  if (row.type !== 'PROD') {
    throw new HostnameError('Public hostnames are assigned to PROD environments only.', 409)
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

  const registered = await listRegisteredEnvironments(db)
  const edge = generateProductionEdgeFilesFromRegistry(registered, {
    edgeDir: input.edgeDir,
    kind: row.node.kind === 'vps' ? 'vps' : 'laptop',
  })

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
    relaunch,
    relaunchError,
  }
}
