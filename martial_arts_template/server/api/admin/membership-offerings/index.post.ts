import { createError, defineEventHandler, readBody } from 'h3'
import { upsertMembershipOfferingSchema } from '../../../../shared/schemas/catalog'
import { useDb } from '../../../database'
import { upsertMembershipOffering } from '../../../services/catalog'
import { throwDomain } from '../../../utils/api'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const parsed = upsertMembershipOfferingSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid offering.' })
  }
  try {
    return await upsertMembershipOffering(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
