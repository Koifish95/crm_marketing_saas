import { createError, defineEventHandler, readBody } from 'h3'
import { patchActivitySchema } from '../../../shared/schemas/sales'
import { updateActivity } from '../../services/sales'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid activity id.' })
  }
  const parsed = patchActivitySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid activity.' })
  }
  try {
    return await updateActivity(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
