import { createError, defineEventHandler, readBody } from 'h3'
import { createSourceSchema } from '../../shared/schemas/sales'
import { createSource } from '../services/acquisition'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createSourceSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid source.' })
  }
  try {
    return await createSource(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
