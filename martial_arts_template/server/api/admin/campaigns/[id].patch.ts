import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateCampaignSchema } from '../../../../shared/schemas/campaign'
import { useDb } from '../../../database'
import { updateCampaign } from '../../../services/campaigns'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'MANAGE_CAMPAIGNS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid campaign id.' })
  }
  const parsed = updateCampaignSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid campaign.' })
  }
  try {
    return await updateCampaign(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
