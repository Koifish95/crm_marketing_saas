import { createError, defineEventHandler, readBody } from 'h3'
import { createUserSchema } from '../../../../shared/schemas/user'
import { useDb } from '../../../database'
import { recordSecurityEvent, requestAuditContext } from '../../../services/security-audit'
import { createManagedUser } from '../../../services/users'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const parsed = createUserSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  try {
    const created = await createManagedUser(useDb(), parsed.data)
    const ctx = requestAuditContext(event)
    await recordSecurityEvent(useDb(), {
      action: 'USER_CREATED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      targetUserId: created.id,
      ...ctx,
      metadata: { role: created.role },
    })
    return created
  } catch (error) {
    throwDomain(error)
  }
})
