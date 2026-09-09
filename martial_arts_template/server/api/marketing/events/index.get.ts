import { createError, defineEventHandler, getQuery } from 'h3'
import { listEventsQuerySchema } from '../../../../shared/schemas/event'
import { useDb } from '../../../database'
import { listAcquisitionEvents } from '../../../services/events'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  const raw = getQuery(event)
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined),
  )
  const parsed = listEventsQuerySchema.safeParse(cleaned)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid event filters.' })
  }
  try {
    return await listAcquisitionEvents(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
