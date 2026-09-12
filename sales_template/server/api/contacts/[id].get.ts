import { createError, defineEventHandler } from 'h3'
import { getContact } from '../../services/sales'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid contact id.' })
  }
  try {
    return await getContact(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
