import { createError, defineEventHandler, setHeader } from 'h3'
import { readProposalLetterhead, letterheadLogoAbsolute } from '../../../services/proposal-letterhead'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  try {
    const letterhead = await readProposalLetterhead(useDb())
    const abs = letterheadLogoAbsolute(letterhead.logoFilename)
    if (!abs) {
      throw createError({ statusCode: 404, message: 'No letterhead logo configured.' })
    }
    const ext = extname(abs).toLowerCase()
    setHeader(event, 'Content-Type', ext === '.png' ? 'image/png' : 'image/jpeg')
    setHeader(event, 'Cache-Control', 'private, max-age=60')
    return readFileSync(abs)
  } catch (error) {
    throwDomain(error)
  }
})
