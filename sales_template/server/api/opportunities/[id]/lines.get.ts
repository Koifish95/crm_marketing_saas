import { createError, defineEventHandler } from 'h3'
import { listOpportunityLines } from '../../../services/commercial'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid opportunity id.' })
  }
  try {
    return await listOpportunityLines(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
