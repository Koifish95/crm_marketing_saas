import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { replaceUserRoleRightsSchema } from '../../../../../shared/schemas/access'
import { useDb } from '../../../../database'
import { replaceUserRoleRights } from '../../../../services/access-rights'
import { recordSecurityEvent, requestAuditContext } from '../../../../services/security-audit'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid User Role.' })
  }
  const parsed = replaceUserRoleRightsSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid Access Rights.' })
  }
  try {
    const catalog = await replaceUserRoleRights(useDb(), id, parsed.data.accessRights)
    await recordSecurityEvent(useDb(), {
      action: 'ACCESS_ROLE_RIGHTS_CHANGED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      ...requestAuditContext(event),
      metadata: { userRoleId: id, accessRights: parsed.data.accessRights },
    })
    return catalog
  } catch (error) {
    throwDomain(error)
  }
})
