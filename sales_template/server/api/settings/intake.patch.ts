import { createError, defineEventHandler, readBody } from 'h3'
import { patchPublicIntakeConfigSchema } from '../../../shared/schemas/sales'
import { writePublicIntakeConfig } from '../../services/public-intake'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = patchPublicIntakeConfigSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid intake settings.' })
  }
  try {
    return await writePublicIntakeConfig(useDb(), parsed.data, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
