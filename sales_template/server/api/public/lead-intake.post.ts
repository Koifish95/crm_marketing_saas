import { createError, defineEventHandler, getRequestHeader, getRequestIP, readBody } from 'h3'
import { publicLeadIntakeSchema } from '../../../shared/schemas/sales'
import { LEAD_IDEMPOTENCY_HEADER, LEAD_INTAKE_KEY_HEADER, intakeKeyMatches, recordLeadNotifyOutcome, submitKeyedLead, validIdempotencyKey } from '../../services/public-intake'
import { notifyNewLead } from '../../services/lead-notify'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { allowPublicRequest } from '../../utils/rate-limit'

const MAX_BYTES = 32_768

export default defineEventHandler(async (event) => {
  if (!intakeKeyMatches(getRequestHeader(event, LEAD_INTAKE_KEY_HEADER))) {
    throw createError({ statusCode: 401, message: 'Invalid intake key.' })
  }
  const length = Number(getRequestHeader(event, 'content-length') || 0)
  if (Number.isFinite(length) && length > MAX_BYTES) {
    throw createError({ statusCode: 413, message: 'That request is too large.' })
  }
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!allowPublicRequest(`lead-intake:${ip}`)) {
    throw createError({ statusCode: 429, message: 'Please try again later.' })
  }
  const parsed = publicLeadIntakeSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Could not submit that lead.' })
  }
  const requestKey = getRequestHeader(event, LEAD_IDEMPOTENCY_HEADER)?.trim() || null
  if (!validIdempotencyKey(requestKey)) {
    throw createError({ statusCode: 400, message: 'Invalid Idempotency-Key.' })
  }
  let result: Awaited<ReturnType<typeof submitKeyedLead>>
  try {
    result = await submitKeyedLead(useDb(), parsed.data, requestKey)
  } catch (error) {
    throwDomain(error)
  }
  if (result.replay) {
    return { ok: true as const, id: result.id }
  }
  // Not awaited: the lead is saved, so a slow or failed email never delays or fails the response.
  const db = useDb()
  void notifyNewLead({ id: result.id, ...parsed.data })
    .then(res => recordLeadNotifyOutcome(db, result.id, res))
    .catch(error => console.error(`[lead-notify] lead ${result.id} outcome not recorded: ${error instanceof Error ? error.message : 'error'}`))
  return { ok: true as const, id: result.id }
})
