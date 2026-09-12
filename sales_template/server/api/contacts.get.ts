import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listContacts } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

const querySchema = z.object({
  search: z.string().trim().max(200).optional(),
  accountId: z.coerce.number().int().positive().optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid contact filters.' })
  }
  try {
    return await listContacts(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
