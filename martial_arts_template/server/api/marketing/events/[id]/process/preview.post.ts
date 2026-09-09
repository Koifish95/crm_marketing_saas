import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { eventBatchProcessSchema } from '../../../../../../shared/schemas/event'
import { useDb } from '../../../../../database'
import { previewEventBatch } from '../../../../../services/events'
import { throwDomain } from '../../../../../utils/api'
import { requireAccessRight } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'PROCESS_EVENT_REGISTRATIONS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid event.' })
  }
  const parsed = eventBatchProcessSchema.safeParse((await readBody(event)) ?? {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid preview.' })
  }
  try {
    return await previewEventBatch(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
