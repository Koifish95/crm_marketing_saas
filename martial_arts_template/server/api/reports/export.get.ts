import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { reportExportQuerySchema } from '../../../shared/schemas/report'
import { useDb } from '../../database'
import { currentMonthReportFilters, reportCsv } from '../../services/reports'
import { throwDomain } from '../../utils/api'
import { requireAdminUser, requireCrmAccessUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const raw = getQuery(event)
  const defaults = currentMonthReportFilters()
  const cleaned = Object.fromEntries(
    Object.entries({ ...defaults, ...raw }).filter(([, value]) => value !== '' && value !== undefined),
  )
  const parsed = reportExportQuerySchema.safeParse(cleaned)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid report export filters.' })
  }
  const user = parsed.data.kind === 'meta'
    ? await requireAdminUser(event)
    : await requireCrmAccessUser(event)
  try {
    const { kind, ...filters } = parsed.data
    const csv = await reportCsv(useDb(), filters, kind, user.role === 'ADMIN')
    setHeader(event, 'content-type', 'text/csv; charset=utf-8')
    setHeader(event, 'content-disposition', `attachment; filename="renzo-${kind}-${filters.fromYmd}-to-${filters.toYmd}.csv"`)
    return csv
  } catch (error) {
    throwDomain(error)
  }
})
