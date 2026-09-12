import { createError, defineEventHandler, readBody } from 'h3'
import { patchOpportunityLineSchema } from '../../../../../shared/schemas/sales'
import { getOpportunityLine, updateOpportunityLine } from '../../../../services/commercial'
import { useDb } from '../../../../database'
import { throwDomain } from '../../../../utils/api'
import { requireSalesAccess } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const opportunityId = Number(getRouterParam(event, 'id'))
  const lineId = Number(getRouterParam(event, 'lineId'))
  if (!Number.isInteger(opportunityId) || opportunityId < 1 || !Number.isInteger(lineId) || lineId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid line id.' })
  }
  const parsed = patchOpportunityLineSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid line.' })
  }
  try {
    const current = await getOpportunityLine(useDb(), lineId)
    if (current.opportunityId !== opportunityId) {
      throw createError({ statusCode: 404, message: 'Commercial line not found.' })
    }
    return await updateOpportunityLine(useDb(), lineId, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
