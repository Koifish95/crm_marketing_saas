import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listTrackingLinks } from '../services/acquisition'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

const querySchema = z.object({
  campaignId: z.coerce.number().int().positive().optional(),
  sourceId: z.coerce.number().int().positive().optional(),
  active: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid tracking link filters.' })
  }
  try {
    return await listTrackingLinks(useDb(), {
      campaignId: parsed.data.campaignId,
      sourceId: parsed.data.sourceId,
      active: parsed.data.active == null ? undefined : parsed.data.active === 'true',
    })
  } catch (error) {
    throwDomain(error)
  }
})
