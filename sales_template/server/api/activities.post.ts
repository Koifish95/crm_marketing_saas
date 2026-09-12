import { createError, defineEventHandler, readBody } from 'h3'
import { createActivitySchema } from '../../shared/schemas/sales'
import { createActivity } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createActivitySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid activity.' })
  }
  try {
    return await createActivity(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
