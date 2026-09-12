import { createError, defineEventHandler, getQuery } from 'h3'
import { listUsersQuerySchema } from '@crm/core/shared/schemas/user'
import { listManagedUsers } from '@crm/core/server/services/users'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const parsed = listUsersQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid user filters.' })
  }
  try {
    return await listManagedUsers(useDb(), {
      search: parsed.data.search,
      role: parsed.data.role,
      active: parsed.data.active == null ? undefined : parsed.data.active === 'true',
    })
  } catch (error) {
    throwDomain(error)
  }
})
