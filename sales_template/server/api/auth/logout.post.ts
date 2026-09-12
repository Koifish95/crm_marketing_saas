import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { recordSecurityEvent, requestAuditContext } from '../../services/security-audit'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event).catch(() => null)
  const actorId = session && 'user' in session ? session.user?.id : undefined
  await recordSecurityEvent(useDb(), {
    action: 'LOGOUT',
    result: 'SUCCESS',
    actorUserId: actorId ?? null,
    targetUserId: actorId ?? null,
    ...requestAuditContext(event),
  })
  await clearUserSession(event)
  return { ok: true }
})
