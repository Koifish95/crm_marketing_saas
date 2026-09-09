import { createError, defineEventHandler } from 'h3'
import { useDb } from '../../../database'
import { recordSecurityEvent, requestAuditContext } from '../../../services/security-audit'
import { isRestartEnabled, processControl, restartExitCode } from '../../../services/system'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  if (!isRestartEnabled()) {
    throw createError({
      statusCode: 400,
      message: 'Restart is not enabled. A process supervisor must set APP_RESTART_ENABLED=true.',
    })
  }
  await recordSecurityEvent(useDb(), {
    action: 'APP_RESTART',
    result: 'SUCCESS',
    actorUserId: actor.id,
    ...requestAuditContext(event),
    metadata: { operation: 'restart' },
  })
  processControl.exit(restartExitCode())
  return { ok: true, action: 'restart' as const }
})
