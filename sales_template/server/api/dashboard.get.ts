import { dashboardCounts } from '../services/sales'
import { useDb } from '../database'
import { requireAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuthUser(event)
  return dashboardCounts(useDb())
})
