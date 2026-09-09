import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateEventRegistrationLineSchema } from '../../../../../shared/schemas/event'
import { useDb } from '../../../../database'
import { updateEventRegistrationLine } from '../../../../services/events'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_ACQUISITION_EVENTS')
  const id = Number(getRouterParam(event, 'lineId'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid participant.' })
  }
  const parsed = updateEventRegistrationLineSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid participant.' })
  }
  try {
    return await updateEventRegistrationLine(useDb(), id, parsed.data, actor)
  } catch (error) {
    throwDomain(error)
  }
})
