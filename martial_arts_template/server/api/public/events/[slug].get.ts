import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../database'
import { getPublicEventBySlug } from '../../../services/events'
import { throwDomain } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug?.trim()) {
    throw createError({ statusCode: 400, message: 'Invalid event.' })
  }
  try {
    return await getPublicEventBySlug(useDb(), slug)
  } catch (error) {
    throwDomain(error)
  }
})
