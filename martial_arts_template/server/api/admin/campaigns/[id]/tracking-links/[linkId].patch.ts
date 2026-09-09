import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateCampaignTrackingLinkSchema } from '../../../../../../shared/schemas/campaign'
import { useDb } from '../../../../../database'
import { updateCampaignTrackingLink } from '../../../../../services/campaigns'
import { throwDomain } from '../../../../../utils/api'
import { requireAccessRight } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'MANAGE_CAMPAIGNS')
  const id = Number(getRouterParam(event, 'id'))
  const linkId = Number(getRouterParam(event, 'linkId'))
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(linkId) || linkId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid tracking link.' })
  }
  const parsed = updateCampaignTrackingLinkSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid tracking link.' })
  }
  try {
    return await updateCampaignTrackingLink(useDb(), id, linkId, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
