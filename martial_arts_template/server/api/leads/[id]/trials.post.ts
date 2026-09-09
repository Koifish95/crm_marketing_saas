import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { staffCreateTrialSchema } from '../../../../shared/schemas/trial'
import { useDb } from '../../../database'
import { scheduleTrialFromSlot } from '../../../services/leads'
import { throwDomain } from '../../../utils/api'
import { requireCrmWriteUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  const parsed = staffCreateTrialSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid trial.' })
  }
  try {
    return await scheduleTrialFromSlot(useDb(), id, parsed.data, user)
  } catch (error) {
    throwDomain(error)
  }
})
