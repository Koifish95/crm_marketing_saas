import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listCampaigns } from '../services/acquisition'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().max(40).optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid campaign filters.' })
  }
  try {
    return await listCampaigns(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
