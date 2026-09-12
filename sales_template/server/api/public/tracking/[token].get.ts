import { createError, defineEventHandler } from 'h3'
import { publicTrackingPayload } from '../../../services/public-intake'
import { useDb } from '../../../database'
import { throwDomain } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const token = String(getRouterParam(event, 'token') || '')
  if (!token) {
    throw createError({ statusCode: 404, message: 'That link is not available.' })
  }
  try {
    return await publicTrackingPayload(useDb(), token)
  } catch (error) {
    throwDomain(error)
  }
})
