import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { upsertMembershipOfferingSchema } from '../../../../shared/schemas/catalog'
import { useDb } from '../../../database'
import { upsertMembershipOffering } from '../../../services/catalog'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid offering id.' })
  }
  const parsed = upsertMembershipOfferingSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid offering.' })
  }
  try {
    return await upsertMembershipOffering(useDb(), { ...parsed.data, id })
  } catch (error) {
    throwDomain(error)
  }
})
