import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../../database'
import { unmapInternalCampaign } from '../../../../services/meta'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const campaignId = Number(getRouterParam(event, 'campaignId'))
  if (!Number.isInteger(campaignId) || campaignId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid campaign id.' })
  }
  try {
    await unmapInternalCampaign(useDb(), campaignId)
    return { ok: true }
  } catch (error) {
    throwDomain(error)
  }
})
