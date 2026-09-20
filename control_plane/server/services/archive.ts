import { existsSync, statSync, unlinkSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { environments } from '../database/schema'
import { LAB_CUSTOMER_SLUG, LAB_ENVIRONMENTS } from '../database/lab-seed'
import { archiveConfirmationError } from '../../shared/utils/lifecycle'
import { backupRegisteredEnvironment, copyEnvironmentBackupOffhost, FleetBackupError } from './fleet-backup'
import {
  decommissionRegisteredEnvironment,
  removeRegisteredVolumes,
  stopRegisteredEnvironment,
} from './docker-relaunch'
import { generateProductionEdgeFilesFromRegistry } from './production-edge-sync'
import { recordOperatorEvent } from './operator-events'
import { getRegisteredEnvironment, listRegisteredEnvironments } from './registry'
import { probeRegisteredHealth } from './health'

export class ArchiveError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export function archiveEnvironmentGuard(row: {
  slug: string
  customer: { slug: string }
  lifecycleStatus: string
  sqliteVolume: string
  assetsVolume: string
} | null, input: {
  confirmSlug?: string
  confirmPhrase?: string
  destinationDir?: string
  skipOffhost?: boolean
  type?: string
}) {
  if (!row) {
    return { statusCode: 404, statusMessage: 'Environment not registered.' }
  }
  if (row.lifecycleStatus === 'archived') {
    return { statusCode: 409, statusMessage: 'This environment is already archived.' }
  }
  if (row.lifecycleStatus === 'provisioning') {
    return { statusCode: 409, statusMessage: 'Wait for provisioning to finish, or Retry, before archive.' }
  }
  if (row.customer.slug === LAB_CUSTOMER_SLUG || LAB_ENVIRONMENTS.some(env => env.slug === row.slug)) {
    return { statusCode: 409, statusMessage: 'Lab-acme environments cannot be archived from the Control Plane.' }
  }
  const blob = `${row.slug} ${row.sqliteVolume} ${row.assetsVolume}`.toLowerCase()
  if (blob.includes('renzo') || blob.includes('webhosting')) {
    return { statusCode: 403, statusMessage: 'Refusing archive for reserved names.' }
  }
  const confirm = archiveConfirmationError({
    slug: row.slug,
    confirmSlug: input.confirmSlug,
    confirmPhrase: input.confirmPhrase,
  })
  if (confirm) {
    return { statusCode: 400, statusMessage: confirm }
  }
  if (input.type === 'PROD' && !input.destinationDir?.trim() && !input.skipOffhost) {
    return { statusCode: 400, statusMessage: 'PROD Archive & Delete requires an existing off-host destination folder.' }
  }
  if (input.type !== 'PROD' && !input.destinationDir?.trim() && !input.skipOffhost) {
    return { statusCode: 400, statusMessage: 'Provide an off-host folder or explicitly skip off-host copy for this non-PROD environment.' }
  }
  if (input.type === 'PROD' && input.skipOffhost) {
    return { statusCode: 400, statusMessage: 'PROD cannot skip the off-host copy.' }
  }
  return null
}

export async function archiveAndDeleteEnvironment(db: Database, id: string, input: {
  confirmSlug: string
  confirmPhrase: string
  destinationDir?: string
  skipOffhost?: boolean
  note?: string
  filesRoot?: string
}) {
  const row = await getRegisteredEnvironment(db, id)
  const guard = archiveEnvironmentGuard(row, {
    ...input,
    type: row?.type,
  })
  if (guard) {
    throw new ArchiveError(guard.statusMessage, guard.statusCode)
  }
  if (!row) {
    throw new ArchiveError('Environment not registered.', 404)
  }

  let finalReleaseId: string | null = null
  let finalSchemaVersion: string | null = null
  try {
    const health = await probeRegisteredHealth(row.healthUrl, [row.healthUrl])
    finalReleaseId = health.releaseId || null
    finalSchemaVersion = health.schemaVersion || null
  } catch {
    // stopped or unreachable environments keep unknown final identity rather than guessing
  }

  if (row.lifecycleStatus !== 'decommissioned' && row.lifecycleStatus !== 'failed') {
    try {
      stopRegisteredEnvironment(row)
    } catch (error) {
      const text = error instanceof Error ? error.message : ''
      if (!/no such|not found|is not running/i.test(text)) {
        throw error
      }
    }
  }

  let backup
  try {
    backup = await backupRegisteredEnvironment(db, id, input.filesRoot)
  } catch (error) {
    if (error instanceof FleetBackupError) {
      throw new ArchiveError(error.message, error.statusCode)
    }
    throw error
  }
  if (!backup.zipPath || !existsSync(backup.zipPath) || statSync(backup.zipPath).size <= 0) {
    throw new ArchiveError('Final backup could not be verified.', 500)
  }

  if (input.destinationDir?.trim()) {
    try {
      backup = await copyEnvironmentBackupOffhost(db, id, input.destinationDir.trim())
    } catch (error) {
      if (error instanceof FleetBackupError) {
        throw new ArchiveError(error.message, error.statusCode)
      }
      throw error
    }
    if (!backup.offhostPath || !existsSync(backup.offhostPath)) {
      throw new ArchiveError('Off-host copy could not be verified.', 500)
    }
  }

  const ownedVolumes = [row.sqliteVolume, row.assetsVolume]
  const siblings = (await listRegisteredEnvironments(db)).filter(item => item.id !== row.id)
  for (const sibling of siblings) {
    if (ownedVolumes.includes(sibling.sqliteVolume) || ownedVolumes.includes(sibling.assetsVolume)) {
      throw new ArchiveError('Refusing archive because a sibling environment shares a volume name.', 409)
    }
  }

  decommissionRegisteredEnvironment({
    slug: row.slug,
    composeFile: row.composeFile,
    envFileLocal: row.envFileLocal,
    envFileExample: row.envFileExample,
    composeProject: row.composeProject,
    filesRoot: input.filesRoot,
    productInstance: row.productInstance,
  })

  const removedVolumes = removeRegisteredVolumes(ownedVolumes, ownedVolumes)

  if (row.envFileLocal && existsSync(row.envFileLocal) && /provisioned|data[\\/]/.test(row.envFileLocal)) {
    try {
      unlinkSync(row.envFileLocal)
    } catch {
      // registry still records the former path
    }
  }

  const now = new Date().toISOString()
  await db.update(environments).set({
    lifecycleStatus: 'archived',
    archivedAt: now,
    archiveNote: input.note?.trim() || null,
    finalBackupId: backup.id,
    finalReleaseId,
    finalSchemaVersion,
    finalExpectedImage: row.expectedImage,
    formerPublicHostname: row.publicHostname,
    publicHostname: null,
    dataRemovedAt: now,
    provisionError: null,
  }).where(eq(environments.id, row.id))

  const remaining = await listRegisteredEnvironments(db)
  if (row.publicHostname || remaining.some(item => item.publicHostname) || process.env.EDGE_ROOT) {
    generateProductionEdgeFilesFromRegistry(remaining, {
      kind: row.node.kind === 'vps' ? 'vps' : 'laptop',
    })
  }

  await recordOperatorEvent(db, {
    action: 'environment.archive',
    summary: `Archived and deleted live data for ${row.slug}.`,
    customerId: row.customer.id,
    productInstanceId: row.productInstance.id,
    environmentId: row.id,
    detail: {
      backupId: backup.id,
      zipPath: backup.zipPath,
      offhostPath: backup.offhostPath || null,
      removedVolumes,
    },
  })

  return {
    id: row.id,
    slug: row.slug,
    lifecycleStatus: 'archived' as const,
    backupId: backup.id,
    zipPath: backup.zipPath,
    offhostPath: backup.offhostPath || null,
    removedVolumes,
  }
}
