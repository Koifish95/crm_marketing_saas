import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { readFileSync, existsSync } from 'node:fs'
import { extname } from 'node:path'
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
    if (!document.logoAbsolutePath || !existsSync(document.logoAbsolutePath)) {
      throw createError({ statusCode: 404, message: 'No logo on this Proposal revision.' })
    }
    const ext = extname(document.logoAbsolutePath).toLowerCase()
    setHeader(event, 'Content-Type', ext === '.png' ? 'image/png' : 'image/jpeg')
    setHeader(event, 'Cache-Control', 'private, max-age=60')
    return readFileSync(document.logoAbsolutePath)
  } catch (error) {
    throwDomain(error)
  }
})
