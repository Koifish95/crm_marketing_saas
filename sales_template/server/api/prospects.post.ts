import { createError, defineEventHandler, readBody } from 'h3'
import { createProspectSchema } from '../../shared/schemas/sales'
import { createManualProspect } from '../services/prospects'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createProspectSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid prospect.' })
  }
  try {
    return await createManualProspect(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
