import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { resetPasswordSchema } from '../../../../../shared/schemas/user'
import { useDb } from '../../../../database'
import { recordSecurityEvent, requestAuditContext } from '../../../../services/security-audit'
import { resetManagedUserPassword } from '../../../../services/users'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  const parsed = resetPasswordSchema.safeParse(await readBody(event) ?? {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid password reset.' })
  }
  try {
    const updated = await resetManagedUserPassword(
      useDb(),
      actor.id,
      id,
      parsed.data.password,
    )
    await recordSecurityEvent(useDb(), {
      action: 'PASSWORD_RESET',
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
