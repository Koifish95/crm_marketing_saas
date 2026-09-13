import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { patchProposalDraftSchema } from '../../../shared/schemas/sales'
import { updateDraftProposal } from '../../services/proposals'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'
import { requirePositiveId } from '../../utils/ids'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = requirePositiveId(getRouterParam(event, 'id'), 'proposal id')
  const parsed = patchProposalDraftSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid proposal draft.' })
  }
  try {
    return await updateDraftProposal(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
