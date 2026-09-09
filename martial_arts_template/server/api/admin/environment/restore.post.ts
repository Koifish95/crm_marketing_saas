import { unlinkSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { defineEventHandler } from 'h3'
import { createDb, getDatabaseUrl, sqliteFilePath } from '../../../database'
import { users } from '../../../database/schema'
import {
  backupMaxBytes,
  restoreLiveBackup,
  saveRestoreUpload,
} from '../../../services/environment-backup'
import { recordSecurityEvent, requestAuditContext } from '../../../services/security-audit'
import { processControl } from '../../../services/system'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  let zipPath = ''
  try {
    const upload = await saveRestoreUpload(event.node.req, backupMaxBytes())
    zipPath = upload.zipPath
    const restored = await restoreLiveBackup(zipPath, upload.confirmEnv)
    await recordRestoreAudit(actor.id, requestAuditContext(event), restored.sourceAppEnv)
    processControl.exit(0)
    return { ok: true, action: 'restore' as const }
  } catch (error) {
    throwDomain(error)
  } finally {
    if (zipPath) {
      try {
        unlinkSync(zipPath)
      } catch {
        // Temp zip may already be gone.
      }
    }
  }
})

async function recordRestoreAudit(
  actorUserId: number,
  context: ReturnType<typeof requestAuditContext>,
  sourceAppEnv: string,
) {
  const sqlitePath = sqliteFilePath(getDatabaseUrl())
  if (!sqlitePath) {
    return
  }
  const { client, db } = createDb(`file:${sqlitePath.replaceAll('\\', '/')}`)
  try {
    const [found] = await db.select({ id: users.id }).from(users).where(eq(users.id, actorUserId)).limit(1)
    await recordSecurityEvent(db, {
      action: 'ENVIRONMENT_RESTORE',
      result: 'SUCCESS',
      actorUserId: found?.id ?? null,
      ...context,
      metadata: { sourceAppEnv },
    })
  } finally {
    client.close()
  }
}
