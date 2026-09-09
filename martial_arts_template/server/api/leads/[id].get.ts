import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../database'
import { getLead } from '../../services/leads'
import { throwDomain } from '../../utils/api'
import { requireCrmAccessUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  try {
    return await getLead(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
