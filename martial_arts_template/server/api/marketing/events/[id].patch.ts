import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateAcquisitionEventSchema } from '../../../../shared/schemas/event'
import { useDb } from '../../../database'
import { updateAcquisitionEvent } from '../../../services/events'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'MANAGE_ACQUISITION_EVENTS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid event.' })
  }
  const parsed = updateAcquisitionEventSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid event.' })
  }
  try {
    return await updateAcquisitionEvent(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
