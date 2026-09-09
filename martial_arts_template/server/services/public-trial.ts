import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { programs } from '../database/schema'
import type { LeadLineRelationship, LeadSource } from '../../shared/schemas/enums'
import type { BookableSlot } from './availability'
import { DomainError } from './errors'
import { personName } from '../../shared/utils/labels'
import { normalizePhone } from '../../shared/utils/phone'
import { formatMinuteOfDay } from '../../shared/utils/time'
import { getBookableSlot } from './availability'
import { resolveCampaignAttribution } from './campaigns'
import { insertLeadLine } from './lead-lines'
import * as leadService from './leads'
import { maybeEstablishSystemCompensation } from './compensation'
import {
  claimSubmission,
  completeSubmission,
  loadSubmission,
  resolveIdempotencyKey,
  waitForCompletedSubmission,
} from './submissions'
import { runTransaction } from './tx'
import { isIdempotencyKeyConflict, isSqliteBusyError } from '../utils/db-errors'

export interface PublicTrialInput {
  path: 'ADULT' | 'KIDS'
  firstName: string
  lastName: string
  phone: string
  email?: string
  experienceLevel?: string
  smsConsent?: boolean
  emailConsent?: boolean
  participantFirstName?: string
  participantLastName?: string
  participantAge?: number
  guardianRelationship?: string
  slotId: string
  source?: string
  campaign?: string
  trackingCode?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
  idempotencyKey?: string
}

export interface PublicHouseholdMemberInput {
  relationship: LeadLineRelationship
  firstName: string
  lastName?: string
  age?: number
  experienceLevel?: string
  programCode: 'ADULT_BJJ' | 'KIDS_BJJ'
  slotId: string
}

export interface PublicHouseholdTrialInput {
  firstName: string
  lastName: string
  phone: string
  email?: string
  smsConsent?: boolean
  emailConsent?: boolean
  guardianRelationship?: string
  members: PublicHouseholdMemberInput[]
  source?: string
  campaign?: string
  trackingCode?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
  idempotencyKey?: string
}

export interface PublicBookingPersonConfirmation {
  firstName: string
  lastName?: string | null
  programName: string
  className: string
  date: string
  time: string
}

export interface PublicTrialConfirmation {
  householdContactName: string
  firstName: string
  lastName?: string | null
  participantFirstName?: string
  programName: string
  className: string
  date: string
  time: string
  people: PublicBookingPersonConfirmation[]
}

export interface PublicBookingConfirmation {
  firstName: string
  lastName?: string | null
  programName: string
  className: string
  date: string
  timeSlot: BookableSlot
}

export interface PublicHouseholdBookingResult {
  replayed: boolean
  lead: Awaited<ReturnType<typeof leadService.getLead>>
  slot: BookableSlot
  bookings: PublicBookingConfirmation[]
  confirmation: PublicTrialConfirmation
}

interface StoredBookingResult {
  leadId: number
  slot: BookableSlot
  bookings: PublicBookingConfirmation[]
  confirmation: PublicTrialConfirmation
}

const SOURCE_ALIASES: Record<string, LeadSource> = {
  'instagram': 'INSTAGRAM',
  'facebook': 'FACEBOOK',
  'website': 'WEBSITE',
  'phone': 'PHONE',
  'walk_in': 'WALK_IN',
  'walk-in': 'WALK_IN',
  'referral': 'REFERRAL',
  'other': 'OTHER',
}

export function resolvePublicSource(raw?: string): LeadSource {
  if (!raw?.trim()) {
    return 'WEBSITE'
  }
  return SOURCE_ALIASES[raw.trim().toLowerCase()] ?? 'WEBSITE'
}

export function membersFromLegacyPublicTrial(input: PublicTrialInput): PublicHouseholdMemberInput[] {
  if (input.path === 'KIDS') {
    return [{
      relationship: 'CHILD',
      firstName: input.participantFirstName?.trim() || 'Child',
      lastName: input.participantLastName,
      age: input.participantAge,
      experienceLevel: 'UNKNOWN',
      programCode: 'KIDS_BJJ',
      slotId: input.slotId,
    }]
  }
  return [{
    relationship: 'SELF',
    firstName: input.firstName,
    lastName: input.lastName,
    experienceLevel: input.experienceLevel ?? 'UNKNOWN',
    programCode: 'ADULT_BJJ',
    slotId: input.slotId,
  }]
}

async function resolveMemberSlot(
  db: Database,
  member: PublicHouseholdMemberInput,
  nowMs?: number,
) {
  const [program] = await db.select().from(programs).where(eq(programs.code, member.programCode)).limit(1)
  if (!program || !program.active) {
    throw new DomainError('That program is not available.')
  }
  const slot = await getBookableSlot(db, member.slotId, {
    age: member.programCode === 'KIDS_BJJ' ? member.age : undefined,
    nowMs,
  })
  if (slot.programId !== program.id) {
    throw new DomainError('That intro time is not available.')
  }
  return { member, program, slot }
}

function buildConfirmation(
  input: PublicHouseholdTrialInput,
  bookings: PublicBookingConfirmation[],
  fallbackSlot: BookableSlot,
): PublicTrialConfirmation {
  const people = bookings.map(booking => ({
    firstName: booking.firstName,
    lastName: booking.lastName,
    programName: booking.programName,
    className: booking.className,
    date: booking.date,
    time: formatMinuteOfDay(booking.timeSlot.startMinute),
  }))
  const first = people[0]
  return {
    householdContactName: personName({ firstName: input.firstName, lastName: input.lastName }),
    firstName: input.firstName,
    lastName: input.lastName,
    participantFirstName: first?.firstName,
    programName: first?.programName ?? '',
    className: first?.className ?? fallbackSlot.name,
    date: first?.date ?? fallbackSlot.date,
    time: first?.time ?? formatMinuteOfDay(fallbackSlot.startMinute),
    people,
  }
}

function parseStoredResult(row: { resultJson: string | null }): StoredBookingResult | null {
  if (!row.resultJson) {
    return null
  }
  try {
    const parsed = JSON.parse(row.resultJson) as StoredBookingResult
    if (!parsed?.leadId || !parsed.confirmation || !parsed.slot) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

async function waitForPublicSubmission(db: Database, key: string) {
  const stored = await waitForCompletedSubmission(db, key, parseStoredResult)
  return replayStoredBooking(db, stored)
}

async function replayStoredBooking(
  db: Database,
  stored: StoredBookingResult,
): Promise<PublicHouseholdBookingResult> {
  const lead = await leadService.getLead(db, stored.leadId)
  return {
    replayed: true,
    lead,
    slot: stored.slot,
    bookings: stored.bookings,
    confirmation: stored.confirmation,
  }
}

async function writeNewPublicBooking(
  tx: Database,
  input: PublicHouseholdTrialInput,
  options: {
    phone: string
    idempotencyKey: string
    resolved: Array<Awaited<ReturnType<typeof resolveMemberSlot>>>
    attribution: Awaited<ReturnType<typeof resolveCampaignAttribution>>
    firstChild?: PublicHouseholdMemberInput
    source: LeadSource
    nowMs?: number
  },
): Promise<PublicHouseholdBookingResult> {
  await claimSubmission(tx, options.idempotencyKey)

  const header = await leadService.createLead(tx, {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: options.phone,
    email: input.email,
    programId: options.resolved[0]!.program.id,
    experienceLevel: input.members.find(member => member.relationship === 'SELF')?.experienceLevel ?? 'UNKNOWN',
    source: options.source,
    campaignId: options.attribution.campaignId,
    campaignTrackingLinkId: options.attribution.campaignTrackingLinkId,
    utmSource: options.attribution.utmSource,
    utmMedium: options.attribution.utmMedium,
    utmContent: options.attribution.utmContent,
    utmTerm: options.attribution.utmTerm,
    smsConsent: input.smsConsent,
    emailConsent: input.emailConsent,
    participantFirstName: options.firstChild?.firstName,
    participantLastName: options.firstChild?.lastName,
    participantAge: options.firstChild?.age,
    guardianRelationship: options.firstChild
      ? (input.guardianRelationship || 'parent/guardian')
      : undefined,
  }, undefined, { skipDefaultLine: true })

  const matches = await leadService.findMatchingContactLeads(tx, {
    phone: options.phone,
    email: input.email,
    excludeId: header.id,
  })

  const bookings: PublicBookingConfirmation[] = []
  for (const item of options.resolved) {
    const slot = await resolveMemberSlot(tx, item.member, options.nowMs)
    const createdLine = await insertLeadLine(tx, header.id, {
      relationship: item.member.relationship,
      firstName: item.member.relationship === 'SELF' ? input.firstName : item.member.firstName,
      lastName: item.member.relationship === 'SELF' ? input.lastName : (item.member.lastName ?? null),
      age: item.member.age ?? null,
      programId: slot.program.id,
      experienceLevel: item.member.experienceLevel ?? 'UNKNOWN',
    })
    await maybeEstablishSystemCompensation(tx, createdLine.id, {
      campaignId: options.attribution.campaignId,
      campaignTrackingLinkId: options.attribution.campaignTrackingLinkId,
    })
    await leadService.createTrial(tx, header.id, {
      scheduledAt: new Date(slot.slot.scheduledAt),
      label: `${slot.slot.name} · ${slot.slot.date}`,
      notes: 'Booked from public /trial.',
      leadLineId: createdLine.id,
    }, undefined, { skipTransaction: true, nowMs: options.nowMs })
    bookings.push({
      firstName: createdLine.firstName,
      lastName: createdLine.lastName,
      programName: slot.program.name,
      className: slot.slot.name,
      date: slot.slot.date,
      timeSlot: slot.slot,
    })
  }

  if (matches.length) {
    await leadService.recordPossibleDuplicates(tx, header.id, matches)
  }

  const confirmation = buildConfirmation(input, bookings, options.resolved[0]!.slot)
  const stored: StoredBookingResult = {
    leadId: header.id,
    slot: options.resolved[0]!.slot,
    bookings,
    confirmation,
  }
  await completeSubmission(tx, options.idempotencyKey, header.id, stored)

  const lead = await leadService.getLead(tx, header.id)
  return {
    replayed: false,
    lead,
    slot: stored.slot,
    bookings,
    confirmation,
  }
}

export async function bookPublicHousehold(
  db: Database,
  input: PublicHouseholdTrialInput,
  options?: { nowMs?: number },
): Promise<PublicHouseholdBookingResult> {
  if (!input.members.length) {
    throw new DomainError('Add at least one person to book.')
  }
  const selfCount = input.members.filter(member => member.relationship === 'SELF').length
  if (selfCount > 1) {
    throw new DomainError('The primary contact can only be booked once.')
  }

  const phone = normalizePhone(input.phone)
  if (!phone || phone.length < 10) {
    throw new DomainError('A phone number is required to schedule an intro.')
  }

  const idempotencyKey = resolveIdempotencyKey(input.idempotencyKey)
  const existing = await loadSubmission(db, idempotencyKey)
  const existingStored = existing ? parseStoredResult(existing) : null
  if (existingStored) {
    return replayStoredBooking(db, existingStored)
  }

  const resolved: Array<Awaited<ReturnType<typeof resolveMemberSlot>>> = []
  for (const member of input.members) {
    resolved.push(await resolveMemberSlot(db, member, options?.nowMs))
  }

  const attribution = await resolveCampaignAttribution(db, {
    campaign: input.campaign,
    trackingCode: input.trackingCode,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmContent: input.utmContent,
    utmTerm: input.utmTerm,
  })

  const firstChild = input.members.find(member => member.relationship === 'CHILD')
  const source = resolvePublicSource(input.source)
  let lastError: unknown
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = await loadSubmission(db, idempotencyKey)
    const currentStored = current ? parseStoredResult(current) : null
    if (currentStored) {
      return replayStoredBooking(db, currentStored)
    }
    try {
      return await runTransaction(db, async (tx) => {
        return writeNewPublicBooking(tx, input, {
          phone,
          idempotencyKey,
          resolved,
          attribution,
          firstChild,
          source,
          nowMs: options?.nowMs,
        })
      })
    } catch (error) {
      lastError = error
      if (isIdempotencyKeyConflict(error)) {
        return waitForPublicSubmission(db, idempotencyKey)
      }
      if (isSqliteBusyError(error) && attempt < 7) {
        await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw lastError
}

export async function bookPublicTrial(db: Database, input: PublicTrialInput, options?: { nowMs?: number }) {
  return bookPublicHousehold(db, {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    smsConsent: input.smsConsent,
    emailConsent: input.emailConsent,
    guardianRelationship: input.guardianRelationship,
    members: membersFromLegacyPublicTrial(input),
    source: input.source,
    campaign: input.campaign,
    trackingCode: input.trackingCode,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmContent: input.utmContent,
    utmTerm: input.utmTerm,
    idempotencyKey: input.idempotencyKey,
  }, options)
}
