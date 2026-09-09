import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateEventRegistrationSchema } from '../../../../../shared/schemas/event'
import { useDb } from '../../../../database'
import { updateEventRegistration } from '../../../../services/events'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_ACQUISITION_EVENTS')
  const id = Number(getRouterParam(event, 'registrationId'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid registration.' })
  }
  const parsed = updateEventRegistrationSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid registration.' })
  }
  try {
    return await updateEventRegistration(useDb(), id, parsed.data, actor)
  } catch (error) {
    throwDomain(error)
  }
})
