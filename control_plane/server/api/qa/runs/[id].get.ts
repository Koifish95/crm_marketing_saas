import { createError } from 'h3'
import { useDb } from '../../../database'
import { getQaRunDetail } from '../../../services/qa'

export default defineEventHandler(async (event) => {
  const detail = await getQaRunDetail(useDb(), getRouterParam(event, 'id') || '')
  if (!detail) throw createError({ statusCode: 404, statusMessage: 'QA run not found.' })
  return detail
})
