import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { customers, environments, hostingNodes } from '../database/schema'
import { createStableId } from '../../shared/utils/ids'
import {
  DEFAULT_TIMEZONE,
  allocateHostPorts,
  assertProvisionSlug,
  defaultEnvironmentPair,
  accessUrlForPort,
  healthUrlForPort,
} from './provision-contract'
import { listRegisteredEnvironments } from './registry'
import { renderProvisionedEnv, writeProvisionedEnvFile } from './provision-env'

export class ProvisionError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function assertOneProdPerCustomer(db: Database, customerId: string, type: string) {
  if (type !== 'PROD') {
    return
  }
  const rows = await db.select({ type: environments.type }).from(environments).where(eq(environments.customerId, customerId))
  if (rows.some(row => row.type === 'PROD')) {
    throw new ProvisionError('A customer may have only one PROD environment.')
  }
}

type NamedEnvironment = {
  type: string
  displayName: string
  slug: string
  containerName: string
  composeProject: string
  composeFile: string
  sqliteVolume: string
  assetsVolume: string
  isolationMarker: string
  expectedImage: string
}

export async function insertNamedEnvironment(db: Database, input: {
  customer: { id: string, displayName: string, adminEmail: string, timezone: string }
  nodeId: string
  names: NamedEnvironment
  hostPort: number
  filesRoot?: string
  now?: string
}) {
  await assertOneProdPerCustomer(db, input.customer.id, input.names.type)
  const [slugHit] = await db.select().from(environments).where(eq(environments.slug, input.names.slug)).limit(1)
  if (slugHit) {
    throw new ProvisionError(`Environment slug ${input.names.slug} is already in use.`)
  }
  const now = input.now ?? new Date().toISOString()
  const id = createStableId()
  const envFile = `data/provisioned/${id}.env`
  await db.insert(environments).values({
    id,
    customerId: input.customer.id,
    hostingNodeId: input.nodeId,
    type: input.names.type,
    displayName: input.names.displayName,
    slug: input.names.slug,
    containerName: input.names.containerName,
    composeProject: input.names.composeProject,
    composeFile: input.names.composeFile,
    envFileLocal: envFile,
    envFileExample: envFile,
    healthUrl: healthUrlForPort(input.hostPort),
    accessUrl: accessUrlForPort(input.hostPort),
    sqliteVolume: input.names.sqliteVolume,
    assetsVolume: input.names.assetsVolume,
    expectedImage: input.names.expectedImage,
    isolationMarker: input.names.isolationMarker,
    hostPort: input.hostPort,
    lifecycleStatus: 'provisioning',
    createdAt: now,
  })
  writeProvisionedEnvFile(envFile, renderProvisionedEnv({
    composeProject: input.names.composeProject,
    containerName: input.names.containerName,
    hostPort: input.hostPort,
    sqliteVolume: input.names.sqliteVolume,
    assetsVolume: input.names.assetsVolume,
    expectedImage: input.names.expectedImage,
    type: input.names.type,
    displayName: input.customer.displayName,
    adminEmail: input.customer.adminEmail,
    timezone: input.customer.timezone,
  }), input.filesRoot)
  return { id, slug: input.names.slug, type: input.names.type, hostPort: input.hostPort, envFileLocal: envFile }
}

export function usedHostPorts(rows: { hostPort?: number, healthUrl: string }[]) {
  return rows.map((row) => {
    if (row.hostPort && row.hostPort > 0) {
      return row.hostPort
    }
    const match = row.healthUrl.match(/:(\d+)/)
    return match ? Number(match[1]) : 0
  }).filter(port => port > 0)
}

function assertAdminEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (!email.includes('@') || !email.includes('.')) {
    throw new ProvisionError('Admin email is required.')
  }
  return email
}

export async function createCustomerWithDefaultEnvironments(db: Database, input: {
  displayName: string
  slug: string
  timezone?: string
  adminEmail: string
  filesRoot?: string
}) {
  const displayName = input.displayName.trim()
  if (!displayName) {
    throw new ProvisionError('Display name is required.')
  }
  const slug = assertProvisionSlug(input.slug)
  const timezone = input.timezone?.trim() || DEFAULT_TIMEZONE
  const adminEmail = assertAdminEmail(input.adminEmail)

  const [existing] = await db.select().from(customers).where(eq(customers.slug, slug)).limit(1)
  if (existing) {
    const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === existing.id)
    return {
      customerId: existing.id,
      slug: existing.slug,
      displayName: existing.displayName,
      resumed: true,
      environments: rows.map(row => ({
        id: row.id,
        slug: row.slug,
        type: row.type,
        hostPort: row.hostPort,
        envFileLocal: row.envFileLocal,
      })),
    }
  }

  const [node] = await db.select().from(hostingNodes).where(eq(hostingNodes.name, 'laptop')).limit(1)
  if (!node) {
    throw new ProvisionError('Laptop hosting node is not registered.', 500)
  }

  const registered = await listRegisteredEnvironments(db)
  const ports = allocateHostPorts(usedHostPorts(registered.map(row => ({
    hostPort: row.hostPort,
    healthUrl: row.healthUrl,
  }))))

  const now = new Date().toISOString()
  const customerId = createStableId()
  await db.insert(customers).values({
    id: customerId,
    slug,
    displayName,
    industryTemplate: 'martial-arts',
    timezone,
    adminEmail,
    createdAt: now,
  })

  const created: { id: string, slug: string, type: string, hostPort: number, envFileLocal: string }[] = []
  for (const names of defaultEnvironmentPair(slug)) {
    created.push(await insertNamedEnvironment(db, {
      customer: { id: customerId, displayName, adminEmail, timezone },
      nodeId: node.id,
      names,
      hostPort: ports[created.length] as number,
      filesRoot: input.filesRoot,
      now,
    }))
  }

  return { customerId, slug, displayName, resumed: false, environments: created }
}
