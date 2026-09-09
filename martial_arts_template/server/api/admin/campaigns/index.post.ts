import { createError, defineEventHandler, readBody } from 'h3'
import { createCampaignSchema } from '../../../../shared/schemas/campaign'
import { useDb } from '../../../database'
import { createCampaign } from '../../../services/campaigns'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'MANAGE_CAMPAIGNS')
  const parsed = createCampaignSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid campaign.' })
  }
  try {
    return await createCampaign(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
