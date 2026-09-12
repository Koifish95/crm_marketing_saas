import { createError, defineEventHandler, getQuery } from 'h3'
import { dashboardQuerySchema } from '../../shared/schemas/sales'
import { salesDashboard } from '../services/reporting'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = dashboardQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid reporting range.' })
  }
  try {
    return await salesDashboard(useDb(), {
      preset: parsed.data.preset,
      startYmd: parsed.data.start,
      endYmd: parsed.data.end,
    })
  } catch (error) {
    throwDomain(error)
  }
})
