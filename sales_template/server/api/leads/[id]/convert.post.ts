import { createError, defineEventHandler } from 'h3'
import { convertLead } from '../../../services/sales'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  try {
    return await convertLead(useDb(), id, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
