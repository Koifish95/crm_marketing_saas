import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../database'
import { deleteAsset } from '../../../services/assets'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'MANAGE_ASSETS')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid asset.' })
  }
  try {
    await deleteAsset(useDb(), id)
    return { ok: true }
  } catch (error) {
    throwDomain(error)
  }
})
