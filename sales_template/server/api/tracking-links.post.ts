import { createError, defineEventHandler, readBody } from 'h3'
import { createTrackingLinkSchema } from '../../shared/schemas/sales'
import { createTrackingLink } from '../services/acquisition'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createTrackingLinkSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid tracking link.' })
  }
  try {
    return await createTrackingLink(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
