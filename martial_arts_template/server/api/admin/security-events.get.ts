import { createError, defineEventHandler, getQuery } from 'h3'
import { listSecurityEventsQuerySchema } from '../../../shared/schemas/user'
import { useDb } from '../../database'
import { listSecurityEvents } from '../../services/security-audit'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const parsed = listSecurityEventsQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid security activity filters.' })
  }
  try {
    return await listSecurityEvents(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
