import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { replaceUserTypeRolesSchema } from '../../../../../shared/schemas/access'
import { useDb } from '../../../../database'
import { replaceUserTypeRoles } from '../../../../services/access-rights'
import { recordSecurityEvent, requestAuditContext } from '../../../../services/security-audit'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid User Type.' })
  }
  const parsed = replaceUserTypeRolesSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid User Roles.' })
  }
  try {
    const catalog = await replaceUserTypeRoles(useDb(), id, parsed.data.userRoleIds)
    await recordSecurityEvent(useDb(), {
      action: 'ACCESS_TYPE_ROLES_CHANGED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      ...requestAuditContext(event),
      metadata: { userTypeId: id, userRoleIds: parsed.data.userRoleIds },
    })
    return catalog
  } catch (error) {
    throwDomain(error)
  }
})
