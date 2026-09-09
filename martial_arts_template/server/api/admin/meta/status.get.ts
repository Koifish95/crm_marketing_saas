import { defineEventHandler } from 'h3'
import { listMetaSyncRuns, listStoredMetaCampaigns, metaStatus } from '../../../services/meta'
import { useDb } from '../../../database'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const db = useDb()
  const runs = await listMetaSyncRuns(db, 10)
  return {
    ...metaStatus(),
    lastSync: runs[0] ?? null,
    recentRuns: runs,
    campaigns: await listStoredMetaCampaigns(db),
  }
})
