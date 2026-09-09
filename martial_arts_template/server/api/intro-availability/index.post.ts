import { createError, defineEventHandler, readBody } from 'h3'
import { introAvailabilityRuleSchema } from '../../../shared/schemas/intro'
import { useDb } from '../../database'
import { createIntroRule } from '../../services/availability'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const parsed = introAvailabilityRuleSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid availability rule.' })
  }
  try {
    return await createIntroRule(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
