import { defineEventHandler } from 'h3'
import { useDb } from '../database'
import { dashboardStats } from '../services/leads'
import { requireAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  return dashboardStats(useDb(), { includeFinancial: user.role !== 'VIEWER' })
})
