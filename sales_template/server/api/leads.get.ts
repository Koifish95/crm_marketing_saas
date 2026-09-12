import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listLeads } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'
import { LEAD_STAGES } from '../../shared/utils/pipeline'

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  stage: z.enum(LEAD_STAGES).optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  mine: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid lead filters.' })
  }
  try {
    return await listLeads(useDb(), {
      search: parsed.data.search,
      stage: parsed.data.stage,
      ownerUserId: parsed.data.mine === 'true' ? user.id : parsed.data.ownerUserId,
    })
  } catch (error) {
    throwDomain(error)
  }
})
