import { createError, setHeader } from 'h3'
import { useDb } from '../../../database'
import { readQaEvidence } from '../../../services/qa'

export default defineEventHandler(async (event) => {
  const evidence = await readQaEvidence(useDb(), getRouterParam(event, 'id') || '')
  if (!evidence) throw createError({ statusCode: 404, statusMessage: 'Evidence not found.' })
  setHeader(event, 'Content-Type', evidence.row.mimeType)
  setHeader(event, 'Content-Disposition', `inline; filename="${evidence.row.fileName.replaceAll('"', '')}"`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return evidence.bytes
})
