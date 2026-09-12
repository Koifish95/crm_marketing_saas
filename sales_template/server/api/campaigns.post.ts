import { createError, defineEventHandler, readBody } from 'h3'
import { createCampaignSchema } from '../../shared/schemas/sales'
import { createCampaign } from '../services/acquisition'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createCampaignSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid campaign.' })
  }
  try {
    return await createCampaign(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
