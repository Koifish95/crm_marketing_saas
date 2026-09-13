import { createError, defineEventHandler, readBody } from 'h3'
import { patchProposalLetterheadSchema } from '../../../shared/schemas/sales'
import { writeProposalLetterhead } from '../../services/proposal-letterhead'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = patchProposalLetterheadSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid letterhead.' })
  }
  try {
    return await writeProposalLetterhead(useDb(), parsed.data, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
