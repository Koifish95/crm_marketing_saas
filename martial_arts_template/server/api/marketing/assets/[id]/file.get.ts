import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { createError, defineEventHandler, getRouterParam, sendStream } from 'h3'
import { useDb } from '../../../../database'
import { getAsset, uploadsDirectory } from '../../../../services/assets'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid asset.' })
  }
  try {
    const asset = await getAsset(useDb(), id)
    setHeader(event, 'content-type', asset.mediaType)
    setHeader(event, 'content-disposition', `inline; filename="${asset.originalFilename.replaceAll('"', '')}"`)
    return sendStream(event, createReadStream(join(uploadsDirectory(), asset.storagePath)))
  } catch (error) {
    throwDomain(error)
  }
})
