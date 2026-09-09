import { eq } from 'drizzle-orm'
import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { assignUserRolesSchema } from '../../../../../shared/schemas/access'
import { useDb } from '../../../../database'
import { users } from '../../../../database/schema'
import { assignExtraUserRoles, presentManagedUserAccess } from '../../../../services/access-rights'
import { recordSecurityEvent, requestAuditContext } from '../../../../services/security-audit'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  const parsed = assignUserRolesSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid User Roles.' })
  }
  try {
    await assignExtraUserRoles(useDb(), actor, id, parsed.data.userRoleIds)
    const [person] = await useDb().select().from(users).where(eq(users.id, id)).limit(1)
    const access = await presentManagedUserAccess(useDb(), id, person?.userTypeId ?? null)
    await recordSecurityEvent(useDb(), {
      action: 'USER_ROLES_CHANGED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      targetUserId: id,
      ...requestAuditContext(event),
      metadata: { userRoleIds: parsed.data.userRoleIds },
    })
    return access
  } catch (error) {
    throwDomain(error)
  }
})
