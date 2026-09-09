import { defineEventHandler } from 'h3'
import { useDb } from '../../../database'
import { recordSecurityEvent, requestAuditContext } from '../../../services/security-audit'
import { processControl } from '../../../services/system'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  await recordSecurityEvent(useDb(), {
    action: 'APP_SHUTDOWN',
    result: 'SUCCESS',
    actorUserId: actor.id,
    ...requestAuditContext(event),
    metadata: { operation: 'shutdown' },
  })
  processControl.exit(0)
  return { ok: true, action: 'shutdown' as const }
})
