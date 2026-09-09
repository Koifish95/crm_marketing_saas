import type { Database } from '../database'
import { inspectRegisteredContainer, type RuntimeState } from './docker-runtime'
import { environmentHeadline, listRegisteredEnvironments } from './registry'

export async function observeRegisteredEnvironments(db: Database) {
  const rows = await listRegisteredEnvironments(db)
  const registeredNames = rows.map(row => row.containerName)
  return rows
    .sort((left, right) => left.type.localeCompare(right.type) * -1)
    .map((row) => {
      const runtime = inspectRegisteredContainer(row.containerName, registeredNames)
      return toEnvironmentView(row, runtime)
    })
}

export function toEnvironmentView(
  row: Awaited<ReturnType<typeof listRegisteredEnvironments>>[number],
  runtime: RuntimeState,
) {
  return {
    id: row.id,
    headline: environmentHeadline({
      customerDisplayName: row.customer.displayName,
      type: row.type,
    }),
    customer: row.customer,
    node: row.node,
    type: row.type,
    displayName: row.displayName,
    slug: row.slug,
    containerName: row.containerName,
    composeFile: row.composeFile,
    envFileLocal: row.envFileLocal,
    envFileExample: row.envFileExample,
    healthUrl: row.healthUrl,
    expectedImage: row.expectedImage,
    sqliteVolume: row.sqliteVolume,
    assetsVolume: row.assetsVolume,
    isolationMarker: row.isolationMarker,
    runtime,
  }
}
