import { createHostBackup, pruneHostBackups, recordBackupStatus, hostBackupRoot } from '../services/host-backup'
import { sqliteFilePath, getDatabaseUrl } from '../database'
import { uploadsDirectory } from '../services/assets'
import { readAppEnv } from '@crm/core/shared/utils/app-env'
import {
  BACKUP_RETENTION_DAYS,
  nextScheduledBackupMs,
} from '../../shared/utils/backup'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)))
}

export default defineNitroPlugin((nitro) => {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return
  }
  if (process.env.APP_BACKUP_SCHEDULE === 'false') {
    return
  }
  const appEnv = readAppEnv()
  if (appEnv !== 'production') {
    return
  }

  const sqlitePath = sqliteFilePath(getDatabaseUrl())
  if (!sqlitePath) {
    return
  }

  let closed = false
  nitro.hooks.hookOnce('close', () => {
    closed = true
  })

  void (async () => {
    const root = hostBackupRoot()
    while (!closed) {
      const next = nextScheduledBackupMs(Date.now())
      recordBackupStatus(root, { nextScheduledAt: next })
      await sleep(next - Date.now())
      if (closed) {
        return
      }
      try {
        const record = await createHostBackup({
          appEnv: 'production',
          sqlitePath,
          uploadsDir: uploadsDirectory(),
          databaseUrl: getDatabaseUrl(),
        })
        pruneHostBackups({
          appEnv: 'production',
          keepPaths: [record.zipPath],
          retentionDays: BACKUP_RETENTION_DAYS,
        })
      } catch (error) {
        console.error('[martial-arts] scheduled PRODUCTION backup failed')
        console.error(error instanceof Error ? error.message : error)
      }
      await sleep(60_000)
    }
  })()
})
