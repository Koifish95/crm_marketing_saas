import { defineEventHandler, getRouterParam } from 'h3'
import { acceptProposal } from '../../../services/proposals'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'
import { requirePositiveId } from '../../../utils/ids'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const id = requirePositiveId(getRouterParam(event, 'id'), 'proposal id')
  try {
    return await acceptProposal(useDb(), id, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
