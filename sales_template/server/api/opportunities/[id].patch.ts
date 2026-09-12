import { createError, defineEventHandler, readBody } from 'h3'
import { patchOpportunitySchema } from '../../../shared/schemas/sales'
import { updateOpportunity } from '../../services/sales'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid opportunity id.' })
  }
  const parsed = patchOpportunitySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid opportunity.' })
  }
  try {
    return await updateOpportunity(useDb(), id, parsed.data, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
