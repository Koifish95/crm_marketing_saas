import { createError, defineEventHandler, getQuery } from 'h3'
import { listAssetsQuerySchema } from '../../../../shared/schemas/asset'
import { useDb } from '../../../database'
import { listAssets } from '../../../services/assets'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  const raw = getQuery(event)
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined),
  )
  const parsed = listAssetsQuerySchema.safeParse(cleaned)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid asset filters.' })
  }
  return listAssets(useDb(), parsed.data)
})
