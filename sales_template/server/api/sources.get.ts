import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listSources } from '../services/acquisition'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

const querySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid source filters.' })
  }
  try {
    return await listSources(useDb(), {
      active: parsed.data.active == null ? undefined : parsed.data.active === 'true',
    })
  } catch (error) {
    throwDomain(error)
  }
})
