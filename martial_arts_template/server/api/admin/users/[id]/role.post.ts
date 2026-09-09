import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { changeRoleSchema } from '../../../../../shared/schemas/user'
import { useDb } from '../../../../database'
import { recordSecurityEvent, requestAuditContext } from '../../../../services/security-audit'
import { changeManagedUserRole } from '../../../../services/users'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  const parsed = changeRoleSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid role.' })
  }
  try {
    const updated = await changeManagedUserRole(useDb(), actor.id, id, parsed.data.role)
    await recordSecurityEvent(useDb(), {
      action: 'ROLE_CHANGED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      targetUserId: updated.id,
      ...requestAuditContext(event),
      metadata: { role: updated.role },
    })
    return updated
  } catch (error) {
    throwDomain(error)
  }
})
