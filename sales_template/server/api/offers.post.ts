import { createError, defineEventHandler, readBody } from 'h3'
import { createOfferSchema } from '../../shared/schemas/sales'
import { createOffer } from '../services/commercial'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createOfferSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid offer.' })
  }
  try {
    return await createOffer(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
