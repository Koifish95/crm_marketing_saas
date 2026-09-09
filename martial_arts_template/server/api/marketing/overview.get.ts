import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { getMarketingOverview } from '../../services/marketing-overview'
import { throwDomain } from '../../utils/api'
import { requireAccessRight } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  try {
    return await getMarketingOverview(useDb())
  } catch (error) {
    throwDomain(error)
  }
})
