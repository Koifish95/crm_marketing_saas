import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { trialOutcomeSchema } from '../../../../shared/schemas/trial'
import { useDb } from '../../../database'
import { setTrialOutcome } from '../../../services/leads'
import { throwDomain } from '../../../utils/api'
import { requireCrmWriteUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid trial id.' })
  }
  const parsed = trialOutcomeSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid trial outcome.' })
  }
  try {
    return await setTrialOutcome(useDb(), id, parsed.data, user)
  } catch (error) {
    throwDomain(error)
  }
})
