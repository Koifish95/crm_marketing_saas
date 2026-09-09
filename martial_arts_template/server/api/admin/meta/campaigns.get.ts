import { defineEventHandler } from 'h3'
import { useDb } from '../../../database'
import { listStoredMetaCampaigns } from '../../../services/meta'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  return listStoredMetaCampaigns(useDb())
})
