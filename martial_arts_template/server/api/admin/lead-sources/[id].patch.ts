import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { upsertLeadSourceSchema } from '../../../../shared/schemas/catalog'
import { useDb } from '../../../database'
import { upsertLeadSource } from '../../../services/catalog'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid source id.' })
  }
  const parsed = upsertLeadSourceSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid source.' })
  }
  try {
    return await upsertLeadSource(useDb(), { ...parsed.data, id })
  } catch (error) {
    throwDomain(error)
  }
})
