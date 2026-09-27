import { createError, defineEventHandler } from 'h3'
import { skipProspect } from '../../../services/prospects'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid prospect id.' })
  }
  try {
    return await skipProspect(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
