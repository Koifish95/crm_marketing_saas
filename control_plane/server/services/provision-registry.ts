import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { customers, environments, hostingNodes } from '../database/schema'
import { createStableId } from '../../shared/utils/ids'
import {
  DEFAULT_TIMEZONE,
  allocateHostPorts,
  assertProvisionSlug,
  defaultEnvironmentPair,
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
    const id = createStableId()
    const hostPort = ports[created.length] as number
    const envFile = `data/provisioned/${id}.env`
    await db.insert(environments).values({
      id,
      customerId,
      hostingNodeId: node.id,
      type: names.type,
      displayName: names.displayName,
      slug: names.slug,
      containerName: names.containerName,
      composeProject: names.composeProject,
      composeFile: names.composeFile,
      envFileLocal: envFile,
      envFileExample: envFile,
      healthUrl: healthUrlForPort(hostPort),
      sqliteVolume: names.sqliteVolume,
      assetsVolume: names.assetsVolume,
      expectedImage: names.expectedImage,
      isolationMarker: names.isolationMarker,
      hostPort,
      lifecycleStatus: 'provisioning',
      createdAt: now,
    })
    writeProvisionedEnvFile(envFile, renderProvisionedEnv({
      composeProject: names.composeProject,
      containerName: names.containerName,
      hostPort,
      sqliteVolume: names.sqliteVolume,
      assetsVolume: names.assetsVolume,
      expectedImage: names.expectedImage,
      type: names.type,
      displayName,
      adminEmail,
      timezone,
    }), input.filesRoot)
    created.push({ id, slug: names.slug, type: names.type, hostPort, envFileLocal: envFile })
  }

  return { customerId, slug, displayName, resumed: false, environments: created }
}
