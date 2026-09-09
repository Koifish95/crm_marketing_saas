import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateIntroAvailabilityRuleSchema } from '../../../shared/schemas/intro'
import { useDb } from '../../database'
import { updateIntroRule } from '../../services/availability'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid rule id.' })
  }
  const parsed = updateIntroAvailabilityRuleSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid availability rule.' })
  }
  try {
    return await updateIntroRule(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
