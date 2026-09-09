import { createError, defineEventHandler, readBody } from 'h3'
import { createAcquisitionEventSchema } from '../../../../shared/schemas/event'
import { useDb } from '../../../database'
import { createAcquisitionEvent } from '../../../services/events'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_ACQUISITION_EVENTS')
  const parsed = createAcquisitionEventSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid event.' })
  }
  try {
    return await createAcquisitionEvent(useDb(), parsed.data, actor)
  } catch (error) {
    throwDomain(error)
  }
})
