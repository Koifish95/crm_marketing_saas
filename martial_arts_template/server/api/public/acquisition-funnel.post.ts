import { createError, defineEventHandler, getRequestIP, readBody } from 'h3'
import { useDb } from '../../database'
import { recordPublicAcquisitionEvent } from '../../services/acquisition-funnel'
import { allowPublicRequest } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!allowPublicRequest(`funnel:${ip}`, 60, 10 * 60_000)) {
    return { ok: true }
  }
  let raw: unknown
  try {
    raw = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid analytics event.' })
  }
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw createError({ statusCode: 400, message: 'Invalid analytics event.' })
  }
  let encoded = ''
  try {
    encoded = JSON.stringify(raw)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid analytics event.' })
  }
  if (encoded.length > 4000) {
    throw createError({ statusCode: 400, message: 'Invalid analytics event.' })
  }
  try {
    const result = await recordPublicAcquisitionEvent(useDb(), event, raw)
    if (result === 'rejected') {
      throw createError({ statusCode: 400, message: 'Invalid analytics event.' })
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    return { ok: true }
  }
  return { ok: true }
})
