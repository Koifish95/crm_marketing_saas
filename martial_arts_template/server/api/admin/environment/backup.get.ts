import { defineEventHandler, sendStream, setHeader } from 'h3'
import type { Readable } from 'node:stream'
import { useDb } from '../../../database'
import { createLiveBackup } from '../../../services/environment-backup'
import { recordSecurityEvent, requestAuditContext } from '../../../services/security-audit'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  try {
    const backup = await createLiveBackup()
    await recordSecurityEvent(useDb(), {
      action: 'ENVIRONMENT_BACKUP',
      result: 'SUCCESS',
      actorUserId: actor.id,
      ...requestAuditContext(event),
      metadata: { filename: backup.filename, sourceAppEnv: backup.manifest.appEnv },
    })
    setHeader(event, 'content-type', 'application/zip')
    setHeader(event, 'content-disposition', `attachment; filename="${backup.filename}"`)
    return sendStream(event, backup.stream as Readable)
  } catch (error) {
    throwDomain(error)
  }
})
