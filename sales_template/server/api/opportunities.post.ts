import { createError, defineEventHandler, readBody } from 'h3'
import { createOpportunitySchema } from '../../shared/schemas/sales'
import { createOpportunity } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createOpportunitySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid opportunity.' })
  }
  try {
    return await createOpportunity(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
