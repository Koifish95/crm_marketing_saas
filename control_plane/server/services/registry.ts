import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { customers, environments, hostingNodes, productInstances } from '../database/schema'

export async function listCustomers(db: Database) {
  return db.select().from(customers)
}

export async function listProductInstances(db: Database) {
  return db.select().from(productInstances)
}

export async function getRegisteredEnvironment(db: Database, id: string) {
  const rows = await listRegisteredEnvironments(db)
  return rows.find(row => row.id === id) ?? null
}

export async function listRegisteredEnvironments(db: Database) {
  const rows = await db.select({
    environment: environments,
    customer: customers,
    node: hostingNodes,
    productInstance: productInstances,
  })
    .from(environments)
    .innerJoin(customers, eq(environments.customerId, customers.id))
    .innerJoin(hostingNodes, eq(environments.hostingNodeId, hostingNodes.id))
    .innerJoin(productInstances, eq(environments.productInstanceId, productInstances.id))

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
    accessUrl: row.environment.accessUrl,
    publicHostname: row.environment.publicHostname,
    sqliteVolume: row.environment.sqliteVolume,
    assetsVolume: row.environment.assetsVolume,
    expectedImage: row.environment.expectedImage,
    isolationMarker: row.environment.isolationMarker,
    hostPort: row.environment.hostPort,
    lifecycleStatus: row.environment.lifecycleStatus,
    provisionError: row.environment.provisionError,
    archivedAt: row.environment.archivedAt,
    archiveNote: row.environment.archiveNote,
    finalBackupId: row.environment.finalBackupId,
    finalReleaseId: row.environment.finalReleaseId,
    finalSchemaVersion: row.environment.finalSchemaVersion,
    finalExpectedImage: row.environment.finalExpectedImage,
    formerPublicHostname: row.environment.formerPublicHostname,
    dataRemovedAt: row.environment.dataRemovedAt,
    customer: {
      id: row.customer.id,
      slug: row.customer.slug,
      displayName: row.customer.displayName,
      timezone: row.customer.timezone,
      adminEmail: row.customer.adminEmail,
      status: row.customer.status,
      deactivatedAt: row.customer.deactivatedAt,
      deactivatedNote: row.customer.deactivatedNote,
      reactivatedAt: row.customer.reactivatedAt,
    },
    productInstance: {
      id: row.productInstance.id,
      productId: row.productInstance.productId,
      displayName: row.productInstance.displayName,
      slug: row.productInstance.slug,
      status: row.productInstance.status,
      deactivatedAt: row.productInstance.deactivatedAt,
      deactivatedNote: row.productInstance.deactivatedNote,
      reactivatedAt: row.productInstance.reactivatedAt,
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
  productDisplayName?: string
}) {
  const product = input.productDisplayName ? ` · ${input.productDisplayName}` : ''
  const status = input.status ? ` · ${input.status}` : ''
  return `${input.customerDisplayName}${product} · ${input.type}${status}`
}
