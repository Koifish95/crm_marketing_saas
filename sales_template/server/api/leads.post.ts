import { createError, defineEventHandler, readBody } from 'h3'
import { createLeadSchema } from '../../shared/schemas/sales'
import { createLead } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createLeadSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid lead.' })
  }
  try {
    return await createLead(useDb(), {
      ...parsed.data,
      ownerUserId: parsed.data.ownerUserId ?? user.id,
    })
  } catch (error) {
    throwDomain(error)
  }
})
