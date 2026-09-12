import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listActivities } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

const querySchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  contactId: z.coerce.number().int().positive().optional(),
  opportunityId: z.coerce.number().int().positive().optional(),
  openOnly: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid activity filters.' })
  }
  try {
    return await listActivities(useDb(), {
      accountId: parsed.data.accountId,
      contactId: parsed.data.contactId,
      opportunityId: parsed.data.opportunityId,
      openOnly: parsed.data.openOnly === 'true',
    })
  } catch (error) {
    throwDomain(error)
  }
})
