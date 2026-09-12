import { createError, defineEventHandler, readBody } from 'h3'
import { createUserSchema } from '@crm/core/shared/schemas/user'
import { createManagedUser } from '@crm/core/server/services/users'
import { useDb } from '../../database'
import { recordSecurityEvent, requestAuditContext } from '../../services/security-audit'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const parsed = createUserSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid user.' })
  }
  try {
    const created = await createManagedUser(useDb(), parsed.data)
    await recordSecurityEvent(useDb(), {
      action: 'USER_CREATED',
      result: 'SUCCESS',
      actorUserId: actor.id,
      targetUserId: created.id,
      ...requestAuditContext(event),
      metadata: { role: created.role },
    })
    return created
  } catch (error) {
    throwDomain(error)
  }
})
