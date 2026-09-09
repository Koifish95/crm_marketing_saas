import { defineEventHandler } from 'h3'
import { useDb } from '../database'
import { listCampaignSummaries } from '../services/campaigns'
import { requireCrmAccessUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  return listCampaignSummaries(useDb())
})
