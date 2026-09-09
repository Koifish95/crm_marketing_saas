import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { listCampaignSummaries } from '../../services/campaigns'
import { requireAccessRight } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  return listCampaignSummaries(useDb())
})
