import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { acquisitionFunnelRangeSchema } from '../../../../../shared/schemas/acquisition-funnel'
import { useDb } from '../../../../database'
import { getCampaignAcquisitionFunnel } from '../../../../services/acquisition-funnel-report'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return firstString(value[0])
  }
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING_REPORTS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid campaign.' })
  }
  const query = getQuery(event)
  const parsed = acquisitionFunnelRangeSchema.safeParse({
    from: firstString(query.from),
    to: firstString(query.to),
  })
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Use YYYY-MM-DD dates.' })
  }
  try {
    return await getCampaignAcquisitionFunnel(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
