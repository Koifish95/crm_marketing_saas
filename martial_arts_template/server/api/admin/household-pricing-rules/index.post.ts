import { createError, defineEventHandler, readBody } from 'h3'
import { upsertHouseholdPricingRuleSchema } from '../../../../shared/schemas/catalog'
import { useDb } from '../../../database'
import { upsertHouseholdPricingRule } from '../../../services/catalog'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const parsed = upsertHouseholdPricingRuleSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid household pricing rule.' })
  }
  try {
    return await upsertHouseholdPricingRule(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
