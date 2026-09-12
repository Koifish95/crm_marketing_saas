import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listOffers } from '../services/commercial'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  active: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid offer filters.' })
  }
  try {
    return await listOffers(useDb(), {
      search: parsed.data.search,
      active: parsed.data.active == null ? undefined : parsed.data.active === 'true',
    })
  } catch (error) {
    throwDomain(error)
  }
})
