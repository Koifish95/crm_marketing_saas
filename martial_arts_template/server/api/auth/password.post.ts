import { createError, defineEventHandler, readBody } from 'h3'
import { changeOwnPasswordSchema } from '../../../shared/schemas/user'
import { useDb } from '../../database'
import { loadActiveUser } from '../../services/auth'
import { recordSecurityEvent, requestAuditContext } from '../../services/security-audit'
import { changeOwnPassword } from '../../services/users'
import { throwDomain } from '../../utils/api'
import { requireAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAuthUser(event)
  const parsed = changeOwnPasswordSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid password change.' })
  }
  try {
    const updated = await changeOwnPassword(
      useDb(),
      actor.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    )
    const current = await loadActiveUser(useDb(), actor.id)
    if (current) {
      await setUserSession(event, { user: current })
    }
    await recordSecurityEvent(useDb(), {
      action: 'PASSWORD_CHANGED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      targetUserId: actor.id,
      ...requestAuditContext(event),
    })
    return {
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        role: updated.role,
        mustChangePassword: updated.mustChangePassword,
      },
      redirectTo: '/dashboard',
    }
  } catch (error) {
    throwDomain(error)
  }
})
