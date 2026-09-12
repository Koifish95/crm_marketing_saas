import { createError, defineEventHandler, readBody } from 'h3'
import { patchCampaignSchema } from '../../../shared/schemas/sales'
import { updateCampaign } from '../../services/acquisition'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid campaign id.' })
  }
  const parsed = patchCampaignSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid campaign.' })
  }
  try {
    return await updateCampaign(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
