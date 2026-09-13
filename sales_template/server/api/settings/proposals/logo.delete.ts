import { defineEventHandler } from 'h3'
import { clearProposalLetterheadLogo } from '../../../services/proposal-letterhead'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  try {
    return await clearProposalLetterheadLogo(useDb(), user.id)
  } catch (error) {
    throwDomain(error)
  }
})
