import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../../database'
import { getCampaignPerformance } from '../../../../services/marketing-overview'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING_REPORTS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid campaign.' })
  }
  try {
    return await getCampaignPerformance(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
