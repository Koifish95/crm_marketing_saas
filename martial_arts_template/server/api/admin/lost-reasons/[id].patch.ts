import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { upsertLostReasonSchema } from '../../../../shared/schemas/catalog'
import { useDb } from '../../../database'
import { upsertLostReason } from '../../../services/catalog'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lost reason id.' })
  }
  const parsed = upsertLostReasonSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid lost reason.' })
  }
  try {
    return await upsertLostReason(useDb(), { ...parsed.data, id })
  } catch (error) {
    throwDomain(error)
  }
})
