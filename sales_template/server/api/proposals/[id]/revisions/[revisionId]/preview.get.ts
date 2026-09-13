import { defineEventHandler, getRouterParam } from 'h3'
import { getProposalDocument } from '../../../../../services/proposals'
import { useDb } from '../../../../../database'
import { throwDomain } from '../../../../../utils/api'
import { requireSalesAccess } from '../../../../../utils/auth'
import { requirePositiveId } from '../../../../../utils/ids'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const id = requirePositiveId(getRouterParam(event, 'id'), 'proposal id')
  const revisionId = requirePositiveId(getRouterParam(event, 'revisionId'), 'revision id')
  try {
    const document = await getProposalDocument(useDb(), id, revisionId)
    const { logoAbsolutePath: _omit, ...publicDocument } = document
    return publicDocument
  } catch (error) {
    throwDomain(error)
  }
})
