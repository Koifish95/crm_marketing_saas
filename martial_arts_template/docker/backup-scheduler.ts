import { existsSync } from 'node:fs'
import { createHostBackup, pruneHostBackups, recordBackupStatus, hostBackupRoot } from '../server/services/host-backup'
import {
  BACKUP_RETENTION_DAYS,
  BACKUP_SCHEDULE_HOUR,
  BACKUP_SCHEDULE_MINUTE,
  BACKUP_SCHEDULE_TIMEZONE,
  nextScheduledBackupMs,
} from '../shared/utils/backup'

/**
 * PRODUCTION-only scheduler. Mounts PRODUCTION volumes read/write for a
 * consistent SQLite checkpoint, then writes zips under RENZO_BACKUP_DIR.
 * Same-host only — this does not replicate off the machine.
 */
const sqlitePath = process.env.BACKUP_SQLITE_PATH || '/source/sqlite/renzo.sqlite'
const uploadsDir = process.env.BACKUP_UPLOADS_DIR || '/source/uploads'
const runOnce = process.env.BACKUP_RUN_ONCE === 'true'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)))
}

async function runProductionBackup() {
  if (!existsSync(sqlitePath)) {
    throw new Error(`PRODUCTION sqlite is missing at ${sqlitePath}`)
  }
  console.info(`[renzo] scheduled PRODUCTION backup starting (${BACKUP_SCHEDULE_TIMEZONE})`)
  const record = await createHostBackup({
    appEnv: 'production',
    sqlitePath,
    uploadsDir,
    databaseUrl: `file:${sqlitePath.replaceAll('\\', '/')}`,
  })
  const pruned = pruneHostBackups({
    appEnv: 'production',
    keepPaths: [record.zipPath],
    retentionDays: BACKUP_RETENTION_DAYS,
  })
  console.info(`[renzo] scheduled backup ok ${record.zipPath} bytes=${record.bytes}`)
  console.info(`[renzo] retention kept=${pruned.kept} removed=${pruned.removed}`)
  return record
}

async function main() {
  const root = hostBackupRoot()
  if (runOnce) {
    await runProductionBackup()
    return
  }

  console.info(`[renzo] PRODUCTION backup scheduler ${String(BACKUP_SCHEDULE_HOUR).padStart(2, '0')}:${String(BACKUP_SCHEDULE_MINUTE).padStart(2, '0')} ${BACKUP_SCHEDULE_TIMEZONE}; retain ${BACKUP_RETENTION_DAYS} days`)
  while (true) {
    const next = nextScheduledBackupMs(Date.now())
    recordBackupStatus(root, { nextScheduledAt: next })
    console.info(`[renzo] next PRODUCTION backup at ${new Date(next).toISOString()}`)
    await sleep(next - Date.now())
    try {
      await runProductionBackup()
    } catch (error) {
      console.error('[renzo] scheduled PRODUCTION backup failed')
      console.error(error instanceof Error ? error.message : error)
    }
    await sleep(60_000)
  }
}

main().catch((error: unknown) => {
  console.error('[renzo] backup scheduler exited')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
