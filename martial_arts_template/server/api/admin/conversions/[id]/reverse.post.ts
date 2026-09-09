import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { reverseConversionSchema } from '../../../../../shared/schemas/lead'
import { useDb } from '../../../../database'
import { reverseConversion } from '../../../../services/conversion'
import { throwDomain } from '../../../../utils/api'
import { requireAdminUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid conversion id.' })
  }
  const parsed = reverseConversionSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid reversal.' })
  }
  try {
    return await reverseConversion(useDb(), id, parsed.data, actor)
  } catch (error) {
    throwDomain(error)
  }
})
