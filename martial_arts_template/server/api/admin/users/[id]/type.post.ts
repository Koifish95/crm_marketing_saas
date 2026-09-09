import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { assignUserTypeSchema } from '../../../../../shared/schemas/access'
import { useDb } from '../../../../database'
import { assignUserType, presentManagedUserAccess } from '../../../../services/access-rights'
import { recordSecurityEvent, requestAuditContext } from '../../../../services/security-audit'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  const parsed = assignUserTypeSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid User Type.' })
  }
  try {
    const updated = await assignUserType(useDb(), actor, id, parsed.data.userTypeId)
    const access = await presentManagedUserAccess(useDb(), updated.id, updated.userTypeId)
    await recordSecurityEvent(useDb(), {
      action: 'USER_TYPE_CHANGED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      targetUserId: updated.id,
      ...requestAuditContext(event),
      metadata: { userTypeId: parsed.data.userTypeId, role: updated.role },
    })
    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      userTypeId: updated.userTypeId,
      active: updated.active,
      ...access,
    }
  } catch (error) {
    throwDomain(error)
  }
})
