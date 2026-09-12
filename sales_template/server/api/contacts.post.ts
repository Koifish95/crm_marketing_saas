import { createError, defineEventHandler, readBody } from 'h3'
import { createContactSchema } from '../../shared/schemas/sales'
import { createContact } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createContactSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid contact.' })
  }
  try {
    return await createContact(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
