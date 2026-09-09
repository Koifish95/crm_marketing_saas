import { createError, defineEventHandler, getRequestIP, getRouterParam, readBody } from 'h3'
import { publicEventRegisterSchema } from '../../../../shared/schemas/event'
import { useDb } from '../../../database'
import { getPublicEventBySlug, registerPublicEvent } from '../../../services/events'
import { throwDomain } from '../../../utils/api'
import { allowPublicRequest } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!allowPublicRequest(`event:${ip}`)) {
    throw createError({ statusCode: 429, message: 'Too many registration attempts. Please wait and try again.' })
  }
  const slug = getRouterParam(event, 'slug')
  if (!slug?.trim()) {
    throw createError({ statusCode: 400, message: 'Invalid event.' })
  }
  const parsed = publicEventRegisterSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid registration.' })
  }
  try {
    const published = await getPublicEventBySlug(useDb(), slug)
    return await registerPublicEvent(useDb(), published.id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
