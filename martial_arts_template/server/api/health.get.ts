import { sql } from 'drizzle-orm'
import { coreHealthBody } from '@crm/core/shared/utils/health'
import { useDb } from '../database'
import { readBackupStatus } from '../services/host-backup'
import { readDiskStatus } from '../services/disk-status'

export const MARTIAL_ARTS_SCHEMA_VERSION = '0020_tidy_frog_thor'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const db = useDb()
  await db.run(sql`select 1`)
  const warnings: string[] = []
  const backup = readBackupStatus()
  if (backup.lastFailure && (!backup.lastSuccess || backup.lastFailure.at >= (backup.lastSuccess.at || 0))) {
    warnings.push(`Backup failed: ${backup.lastFailure.message}`)
  }
  try {
    const disk = await readDiskStatus(process.env.APP_BACKUP_DIR || process.cwd())
    if (disk.warning) {
      warnings.push(disk.warning)
    }
  } catch {
    warnings.push('Disk status is unavailable.')
  }

  return coreHealthBody({
    appName: String(config.public.appName || ''),
    timezone: String(config.public.timezone || ''),
    database: 'reachable',
    schemaVersion: MARTIAL_ARTS_SCHEMA_VERSION,
    warnings,
  })
})
