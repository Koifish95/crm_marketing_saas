import type { Database } from '../database'
import { inspectRegisteredContainer, type RuntimeState } from './docker-runtime'
import { latestBackupsByEnvironment, summarizeBackup } from './fleet-backup'
import { combineStatus, probeRegisteredHealth } from './health'
import { environmentHeadline, listRegisteredEnvironments } from './registry'

export async function observeRegisteredEnvironments(db: Database) {
  const rows = await listRegisteredEnvironments(db)
  const backups = await latestBackupsByEnvironment(db)
  const registeredNames = rows.map(row => row.containerName)
  const registeredHealth = rows.map(row => row.healthUrl)
  const views = []
  for (const row of rows.sort((left, right) => left.type.localeCompare(right.type) * -1)) {
    const runtime = inspectRegisteredContainer(row.containerName, registeredNames)
    const health = runtime === 'running'
      ? await probeRegisteredHealth(row.healthUrl, registeredHealth)
      : { ok: false as const, error: 'not running' }
    const last = backups.get(row.id)
    views.push(toEnvironmentView(row, runtime, health.ok, health.error, last ? summarizeBackup(last) : null))
  }
  return views
}

export function toEnvironmentView(
  row: Awaited<ReturnType<typeof listRegisteredEnvironments>>[number],
  runtime: RuntimeState,
  healthOk: boolean,
  healthError?: string,
  lastBackup: ReturnType<typeof summarizeBackup> | null = null,
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
    accessUrl: row.accessUrl,
    hostPort: row.hostPort,
    lifecycleStatus: row.lifecycleStatus,
    composeProject: row.composeProject,
    expectedImage: row.expectedImage,
    sqliteVolume: row.sqliteVolume,
    assetsVolume: row.assetsVolume,
    isolationMarker: row.isolationMarker,
    runtime,
    healthOk,
    healthError,
    lastBackup,
  }
}
