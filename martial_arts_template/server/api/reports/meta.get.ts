import { createError, defineEventHandler, getQuery } from 'h3'
import { reportFiltersSchema } from '../../../shared/schemas/report'
import { useDb } from '../../database'
import { currentMonthReportFilters } from '../../services/reports'
import { metaPerformanceReport } from '../../services/meta'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const raw = getQuery(event)
  const defaults = currentMonthReportFilters()
  const cleaned = Object.fromEntries(
    Object.entries({ ...defaults, ...raw }).filter(([, value]) => value !== '' && value !== undefined),
  )
  const parsed = reportFiltersSchema.safeParse(cleaned)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid report filters.' })
  }
  try {
    return await metaPerformanceReport(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
