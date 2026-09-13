import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { setProposalLetterheadLogo } from '../../../services/proposal-letterhead'
import { saveLetterheadLogo } from '../../../services/proposal-storage'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file')
  if (!file?.data || !file.filename) {
    throw createError({ statusCode: 400, message: 'Choose a PNG or JPEG logo.' })
  }
  try {
    const filename = saveLetterheadLogo(file.filename, Buffer.from(file.data))
    return await setProposalLetterheadLogo(useDb(), filename, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
