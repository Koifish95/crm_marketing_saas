import { createError, defineEventHandler, getQuery } from 'h3'
import { listUsersQuerySchema } from '../../../../shared/schemas/user'
import { useDb } from '../../../database'
import { listManagedUsers } from '../../../services/users'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

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
