import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { getOrRegeneratePdf } from '../../../../../services/proposals'
import { useDb } from '../../../../../database'
import { throwDomain } from '../../../../../utils/api'
import { requireSalesAccess } from '../../../../../utils/auth'
import { requirePositiveId } from '../../../../../utils/ids'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const id = requirePositiveId(getRouterParam(event, 'id'), 'proposal id')
  const revisionId = requirePositiveId(getRouterParam(event, 'revisionId'), 'revision id')
  try {
    const pdf = await getOrRegeneratePdf(useDb(), id, revisionId)
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="${pdf.filename}"`)
    return pdf.bytes
  } catch (error) {
    throwDomain(error)
  }
})
