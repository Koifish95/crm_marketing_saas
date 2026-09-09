import { createError, defineEventHandler, getQuery } from 'h3'
import { useDb } from '../database'
import { listMembershipOfferings } from '../services/catalog'
import { requireCrmAccessUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmAccessUser(event)
  const includeInactive = getQuery(event).includeInactive === 'true'
  if (includeInactive && user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Only an admin can list inactive offerings.' })
  }
  return listMembershipOfferings(useDb(), { activeOnly: !includeInactive })
})
