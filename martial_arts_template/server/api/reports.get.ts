import { createError, defineEventHandler, getQuery } from 'h3'
import { reportFiltersSchema } from '../../shared/schemas/report'
import { useDb } from '../database'
import { acquisitionReport, currentMonthReportFilters, presentAcquisitionReport } from '../services/reports'
import { throwDomain } from '../utils/api'
import { requireCrmAccessUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmAccessUser(event)
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
    const report = await acquisitionReport(useDb(), parsed.data)
    return presentAcquisitionReport(report, user.role === 'ADMIN')
  } catch (error) {
    throwDomain(error)
  }
})
