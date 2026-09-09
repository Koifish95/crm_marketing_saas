import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { useDb } from '../../../database'
import { createAsset } from '../../../services/assets'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_ASSETS')
  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.data && part.filename)
  if (!file?.data || !file.filename) {
    throw createError({ statusCode: 400, message: 'Upload a file.' })
  }
  const displayName = parts?.find(part => part.name === 'displayName')?.data.toString('utf8')
  const description = parts?.find(part => part.name === 'description')?.data.toString('utf8')
  const campaignRaw = parts?.find(part => part.name === 'campaignId')?.data.toString('utf8')
  try {
    return await createAsset(useDb(), {
      displayName: displayName || file.filename,
      originalFilename: file.filename,
      mediaType: file.type || 'application/octet-stream',
      bytes: Buffer.from(file.data),
      description: description || null,
      campaignId: campaignRaw ? Number(campaignRaw) : null,
    }, actor)
  } catch (error) {
    throwDomain(error)
  }
})
