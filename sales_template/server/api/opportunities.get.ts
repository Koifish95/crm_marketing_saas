import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listOpportunities } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'
import { OPPORTUNITY_STAGES } from '../../shared/utils/pipeline'

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  accountId: z.coerce.number().int().positive().optional(),
  stage: z.enum(OPPORTUNITY_STAGES).optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid opportunity filters.' })
  }
  try {
    return await listOpportunities(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
