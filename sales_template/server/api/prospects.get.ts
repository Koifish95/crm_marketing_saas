import { createError, defineEventHandler, getQuery } from 'h3'
import { listProspectsQuerySchema } from '../../shared/schemas/sales'
import { listProspects, prospectCounts } from '../services/prospects'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = listProspectsQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid prospect filters.' })
  }
  try {
    const db = useDb()
    const [items, counts] = await Promise.all([
      listProspects(db, parsed.data),
      prospectCounts(db),
    ])
    return { items, counts }
  } catch (error) {
    throwDomain(error)
  }
})
