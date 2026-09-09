import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateAssetSchema } from '../../../../shared/schemas/asset'
import { useDb } from '../../../database'
import { updateAsset } from '../../../services/assets'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'MANAGE_ASSETS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid asset.' })
  }
  const parsed = updateAssetSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid asset.' })
  }
  try {
    return await updateAsset(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
