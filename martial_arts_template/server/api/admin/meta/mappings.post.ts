import { createError, defineEventHandler, readBody } from 'h3'
import { mapCampaignMetaSchema } from '../../../../shared/schemas/campaign'
import { useDb } from '../../../database'
import { mapInternalCampaign } from '../../../services/meta'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  const parsed = mapCampaignMetaSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid mapping.' })
  }
  try {
    return await mapInternalCampaign(useDb(), parsed.data, user)
  } catch (error) {
    throwDomain(error)
  }
})
