import { createError, defineEventHandler, readBody } from 'h3'
import { markWonSchema } from '../../../../shared/schemas/sales'
import { markOpportunityWon } from '../../../services/sales'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid opportunity id.' })
  }
  const body = await readBody(event).catch(() => ({}))
  const parsed = markWonSchema.safeParse(body ?? {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid Won request.' })
  }
  try {
    return await markOpportunityWon(useDb(), id, {
      cancelOpenActivities: parsed.data.cancelOpenActivities,
      actorUserId: user.id,
    })
  } catch (error) {
    throwDomain(error)
  }
})
