import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../database'
import { resolvePublicTrackingSlug } from '../../../services/campaigns'
import { throwDomain } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug?.trim()) {
    throw createError({ statusCode: 404, message: 'Tracking link not found.' })
  }
  try {
    return await resolvePublicTrackingSlug(useDb(), slug)
  } catch (error) {
    throwDomain(error)
  }
})
