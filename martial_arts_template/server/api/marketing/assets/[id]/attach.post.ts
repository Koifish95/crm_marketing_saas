import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { attachAssetSchema } from '../../../../../shared/schemas/asset'
import { useDb } from '../../../../database'
import { attachAssetToCampaign, attachAssetToContent } from '../../../../services/assets'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'MANAGE_ASSETS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid asset.' })
  }
  const parsed = attachAssetSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid attachment.' })
  }
  try {
    if (parsed.data.contentItemId) {
      return await attachAssetToContent(useDb(), id, parsed.data.contentItemId)
    }
    return await attachAssetToCampaign(useDb(), id, parsed.data.campaignId!)
  } catch (error) {
    throwDomain(error)
  }
})
