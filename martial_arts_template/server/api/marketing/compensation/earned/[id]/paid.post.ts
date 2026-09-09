import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { markCompensationPaidSchema } from '../../../../../../shared/schemas/compensation'
import { useDb } from '../../../../../database'
import { markCompensationPaid } from '../../../../../services/compensation'
import { throwDomain } from '../../../../../utils/api'
import { requireAccessRight } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_COMPENSATION_ATTRIBUTION')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid compensation entry.' })
  }
  const parsed = markCompensationPaidSchema.safeParse((await readBody(event)) ?? {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid payment.' })
  }
  try {
    return await markCompensationPaid(useDb(), id, actor, parsed.data.paidAt)
  } catch (error) {
    throwDomain(error)
  }
})
