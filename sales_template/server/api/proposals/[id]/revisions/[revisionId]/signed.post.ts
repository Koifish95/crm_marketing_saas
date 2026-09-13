import { createError, defineEventHandler, getRouterParam, readMultipartFormData } from 'h3'
import { uploadSignedPdf } from '../../../../../services/proposals'
import { useDb } from '../../../../../database'
import { throwDomain } from '../../../../../utils/api'
import { requireSalesAccess } from '../../../../../utils/auth'
import { requirePositiveId } from '../../../../../utils/ids'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const id = requirePositiveId(getRouterParam(event, 'id'), 'proposal id')
  const revisionId = requirePositiveId(getRouterParam(event, 'revisionId'), 'revision id')
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file')
  if (!file?.data) {
    throw createError({ statusCode: 400, message: 'Choose a PDF file to upload.' })
  }
  try {
    return await uploadSignedPdf(useDb(), id, user.id, {
      filename: file.filename,
      type: file.type,
      data: Buffer.from(file.data),
    }, revisionId)
  } catch (error) {
    throwDomain(error)
  }
})
