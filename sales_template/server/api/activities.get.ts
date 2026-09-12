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
  leadId: z.coerce.number().int().positive().optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  openOnly: z.enum(['true', 'false']).optional(),
  mine: z.enum(['true', 'false']).optional(),
  queue: z.enum(['overdue', 'due_today', 'upcoming', 'open', 'completed', 'cancelled']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid activity filters.' })
  }
  try {
    return await listActivities(useDb(), {
      accountId: parsed.data.accountId,
      contactId: parsed.data.contactId,
      opportunityId: parsed.data.opportunityId,
      leadId: parsed.data.leadId,
      ownerUserId: parsed.data.mine === 'true' ? user.id : parsed.data.ownerUserId,
      openOnly: parsed.data.openOnly === 'true',
      queue: parsed.data.queue,
    })
  } catch (error) {
    throwDomain(error)
  }
})
