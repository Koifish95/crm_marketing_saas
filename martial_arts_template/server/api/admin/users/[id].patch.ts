import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { patchUserSchema } from '../../../../shared/schemas/user'
import { useDb } from '../../../database'
import { recordSecurityEvent, requestAuditContext } from '../../../services/security-audit'
import { updateManagedUser } from '../../../services/users'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  const parsed = patchUserSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  try {
    const updated = await updateManagedUser(useDb(), id, parsed.data)
    await recordSecurityEvent(useDb(), {
      action: 'USER_EDITED',
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
