import { createError, defineEventHandler, getRequestHeader, readBody } from 'h3'
import { getRequestIP } from 'h3'
import { publicIntakeSubmitSchema } from '../../../shared/schemas/sales'
import { submitPublicIntake } from '../../services/public-intake'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { allowPublicRequest } from '../../utils/rate-limit'
import { recordSecurityEvent, requestAuditContext } from '../../services/security-audit'

const MAX_BYTES = 32_768

export default defineEventHandler(async (event) => {
  const lengthHeader = getRequestHeader(event, 'content-length')
  const length = lengthHeader ? Number(lengthHeader) : 0
  if (Number.isFinite(length) && length > MAX_BYTES) {
    throw createError({ statusCode: 413, message: 'That request is too large.' })
  }
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!allowPublicRequest(`intake:${ip}`)) {
    const audit = requestAuditContext(event)
    await recordSecurityEvent(useDb(), {
      action: 'PUBLIC_INTAKE_THROTTLED',
      result: 'DENIED',
      ip: audit.ip,
      userAgent: audit.userAgent,
    })
    throw createError({ statusCode: 429, message: 'Please try again later.' })
  }
  const parsed = publicIntakeSubmitSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Could not submit that inquiry.' })
  }
  try {
    return await submitPublicIntake(useDb(), {
      token: parsed.data.token,
      idempotencyKey: parsed.data.idempotencyKey,
      honeypot: parsed.data.website,
      values: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        companyName: parsed.data.companyName,
        message: parsed.data.message,
      },
    })
  } catch (error) {
    const audit = requestAuditContext(event)
    await recordSecurityEvent(useDb(), {
      action: 'PUBLIC_INTAKE_REJECTED',
      result: 'FAILURE',
      ip: audit.ip,
      userAgent: audit.userAgent,
    })
    throwDomain(error)
  }
})
