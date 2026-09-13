import { defineEventHandler, getRouterParam } from 'h3'
import { getOpportunityProposalBundle } from '../../../services/proposals'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'
import { requirePositiveId } from '../../../utils/ids'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const id = requirePositiveId(getRouterParam(event, 'id'), 'opportunity id')
  try {
    return await getOpportunityProposalBundle(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
