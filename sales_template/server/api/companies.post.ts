import { createError, defineEventHandler, readBody } from 'h3'
import { createCompanySchema } from '../../shared/schemas/sales'
import { createCompany } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createCompanySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid company.' })
  }
  try {
    return await createCompany(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
