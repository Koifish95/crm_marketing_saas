import { rescheduleTrialSchema } from '../../../../shared/schemas/trial'
import { useDb } from '../../../database'
import { rescheduleTrial } from '../../../services/leads'
import { throwDomain } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid trial id.' })
  }
  const parsed = rescheduleTrialSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid reschedule.' })
  }
  try {
    return await rescheduleTrial(useDb(), id, parsed.data, user)
  } catch (error) {
    throwDomain(error)
  }
})
