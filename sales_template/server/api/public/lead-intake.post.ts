import { createError, defineEventHandler, getRequestHeader, getRequestIP, readBody } from 'h3'
import { publicLeadIntakeSchema } from '../../../shared/schemas/sales'
import { LEAD_INTAKE_KEY_HEADER, intakeKeyMatches, submitKeyedLead } from '../../services/public-intake'
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
  try {
    return await submitKeyedLead(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
