import type { Database } from '../database'
import { inspectRegisteredContainer, type RuntimeState } from './docker-runtime'
import { combineStatus, probeRegisteredHealth } from './health'
import { environmentHeadline, listRegisteredEnvironments } from './registry'

export async function observeRegisteredEnvironments(db: Database) {
  const rows = await listRegisteredEnvironments(db)
  const registeredNames = rows.map(row => row.containerName)
  const registeredHealth = rows.map(row => row.healthUrl)
  const views = []
  for (const row of rows.sort((left, right) => left.type.localeCompare(right.type) * -1)) {
    const runtime = inspectRegisteredContainer(row.containerName, registeredNames)
    const health = runtime === 'running'
      ? await probeRegisteredHealth(row.healthUrl, registeredHealth)
      : { ok: false as const, error: 'not running' }
    views.push(toEnvironmentView(row, runtime, health.ok, health.error))
  }
  return views
}

export function toEnvironmentView(
  row: Awaited<ReturnType<typeof listRegisteredEnvironments>>[number],
  runtime: RuntimeState,
  healthOk: boolean,
  healthError?: string,
) {
  const status = combineStatus(runtime, runtime === 'running' ? healthOk : null)
  return {
    id: row.id,
    status,
    headline: environmentHeadline({
      customerDisplayName: row.customer.displayName,
      type: row.type,
      status,
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
    healthOk,
    healthError,
  }
}
