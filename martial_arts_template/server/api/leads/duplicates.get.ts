import { defineEventHandler, getQuery } from 'h3'
import { useDb } from '../../database'
import { findDuplicateLeads } from '../../services/leads'
import { requireCrmAccessUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  const query = getQuery(event)
  const excludeId = query.excludeId ? Number(query.excludeId) : undefined
  return findDuplicateLeads(useDb(), {
    phone: typeof query.phone === 'string' ? query.phone : undefined,
    email: typeof query.email === 'string' ? query.email : undefined,
    excludeId: Number.isInteger(excludeId) ? excludeId : undefined,
  })
})
