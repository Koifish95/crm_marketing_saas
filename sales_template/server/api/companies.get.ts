import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listCompanies } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  active: z.enum(['true', 'false']).optional(),
  lifecycle: z.string().trim().max(40).optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid company filters.' })
  }
  try {
    return await listCompanies(useDb(), {
      search: parsed.data.search,
      active: parsed.data.active == null ? undefined : parsed.data.active === 'true',
      lifecycle: parsed.data.lifecycle,
    })
  } catch (error) {
    throwDomain(error)
  }
})
