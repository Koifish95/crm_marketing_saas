import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../../database'
import { recordSecurityEvent, requestAuditContext } from '../../../../services/security-audit'
import { setManagedUserActive } from '../../../../services/users'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  try {
    const updated = await setManagedUserActive(useDb(), actor.id, id, true)
    await recordSecurityEvent(useDb(), {
      action: 'USER_ACTIVATED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      targetUserId: updated.id,
      ...requestAuditContext(event),
    })
    return updated
  } catch (error) {
    throwDomain(error)
  }
})
