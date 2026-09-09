import { createError, defineEventHandler, getRequestIP, readBody } from 'h3'
import { publicHouseholdTrialSchema, publicTrialSchema } from '../../../shared/schemas/intro'
import { useDb } from '../../database'
import { bookPublicHousehold, bookPublicTrial } from '../../services/public-trial'
import { throwDomain } from '../../utils/api'
import { allowPublicRequest } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!allowPublicRequest(`trial:${ip}`)) {
    throw createError({ statusCode: 429, message: 'Too many scheduling attempts. Please wait and try again.' })
  }

  const raw = await readBody(event)
  const householdParsed = Array.isArray(raw?.members)
    ? publicHouseholdTrialSchema.safeParse(raw)
    : null
  const legacyParsed = householdParsed ? null : publicTrialSchema.safeParse(raw)
  const parsed = householdParsed?.success
    ? householdParsed
    : legacyParsed
  if (!parsed?.success) {
    const message = householdParsed && !householdParsed.success
      ? householdParsed.error.issues[0]?.message
      : legacyParsed && !legacyParsed.success
        ? legacyParsed.error.issues[0]?.message
        : 'Invalid trial request.'
    throw createError({ statusCode: 400, message: message ?? 'Invalid trial request.' })
  }

  try {
    const result = 'members' in parsed.data
      ? await bookPublicHousehold(useDb(), {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        smsConsent: parsed.data.smsConsent,
        emailConsent: parsed.data.emailConsent,
        guardianRelationship: parsed.data.guardianRelationship,
        members: parsed.data.members,
        source: parsed.data.source,
        campaign: parsed.data.campaign,
        trackingCode: parsed.data.trackingCode,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmContent: parsed.data.utmContent,
        utmTerm: parsed.data.utmTerm,
        idempotencyKey: parsed.data.idempotencyKey,
      })
      : await bookPublicTrial(useDb(), {
        path: parsed.data.path,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        experienceLevel: parsed.data.experienceLevel,
        smsConsent: parsed.data.smsConsent,
        emailConsent: parsed.data.emailConsent,
        participantFirstName: parsed.data.participantFirstName,
        participantLastName: parsed.data.participantLastName,
        participantAge: parsed.data.participantAge,
        guardianRelationship: parsed.data.guardianRelationship,
        slotId: parsed.data.slotId,
        source: parsed.data.source,
        campaign: parsed.data.campaign,
        trackingCode: parsed.data.trackingCode,
        utmSource: parsed.data.utmSource,
        utmMedium: parsed.data.utmMedium,
        utmContent: parsed.data.utmContent,
        utmTerm: parsed.data.utmTerm,
        idempotencyKey: parsed.data.idempotencyKey,
      })

    return {
      ok: true,
      confirmation: result.confirmation,
    }
  } catch (error) {
    throwDomain(error)
  }
})
