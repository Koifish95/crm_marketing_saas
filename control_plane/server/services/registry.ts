import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { customers, environments, hostingNodes } from '../database/schema'

export async function getRegisteredEnvironment(db: Database, id: string) {
  const rows = await listRegisteredEnvironments(db)
  return rows.find(row => row.id === id) ?? null
}

export async function listRegisteredEnvironments(db: Database) {
  const rows = await db.select({
    environment: environments,
    customer: customers,
    node: hostingNodes,
  })
    .from(environments)
    .innerJoin(customers, eq(environments.customerId, customers.id))
    .innerJoin(hostingNodes, eq(environments.hostingNodeId, hostingNodes.id))

  return rows.map(row => ({
    id: row.environment.id,
    type: row.environment.type,
    displayName: row.environment.displayName,
    slug: row.environment.slug,
    containerName: row.environment.containerName,
    composeProject: row.environment.composeProject,
    composeFile: row.environment.composeFile,
    envFileLocal: row.environment.envFileLocal,
    envFileExample: row.environment.envFileExample,
    healthUrl: row.environment.healthUrl,
    sqliteVolume: row.environment.sqliteVolume,
    assetsVolume: row.environment.assetsVolume,
    expectedImage: row.environment.expectedImage,
    isolationMarker: row.environment.isolationMarker,
    hostPort: row.environment.hostPort,
    lifecycleStatus: row.environment.lifecycleStatus,
    customer: {
      id: row.customer.id,
      slug: row.customer.slug,
      displayName: row.customer.displayName,
      timezone: row.customer.timezone,
      adminEmail: row.customer.adminEmail,
    },
    node: {
      id: row.node.id,
      name: row.node.name,
      kind: row.node.kind,
      driver: row.node.driver,
    },
  }))
}

export function environmentHeadline(input: {
  customerDisplayName: string
  type: string
  status?: string
}) {
  const status = input.status ? ` · ${input.status}` : ''
  return `${input.customerDisplayName} · ${input.type}${status}`
}
