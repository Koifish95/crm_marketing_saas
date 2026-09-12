import { createError, defineEventHandler } from 'h3'
import { deleteOpportunityLine, getOpportunityLine } from '../../../../services/commercial'
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
  try {
    const current = await getOpportunityLine(useDb(), lineId)
    if (current.opportunityId !== opportunityId) {
      throw createError({ statusCode: 404, message: 'Commercial line not found.' })
    }
    return await deleteOpportunityLine(useDb(), lineId)
  } catch (error) {
    throwDomain(error)
  }
})
