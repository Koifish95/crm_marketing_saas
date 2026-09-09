import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../database'
import { getAcquisitionEvent } from '../../../services/events'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid event.' })
  }
  try {
    return await getAcquisitionEvent(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
