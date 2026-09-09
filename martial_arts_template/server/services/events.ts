import { desc, eq, inArray } from 'drizzle-orm'
import type { Database } from '../database'
import {
  acquisitionEventCommunicationIntents,
  acquisitionEventQuestionAnswers,
  acquisitionEventQuestions,
  acquisitionEventRegistrationHistory,
  acquisitionEventRegistrationLines,
  acquisitionEventRegistrations,
  acquisitionEventSessions,
  acquisitionEvents,
  leadLines,
  leadNotes,
  leads,
  programs,
} from '../database/schema'
import type {
  AcquisitionEventStatus,
  EventAttendance,
  EventQuestionFieldType,
  LeadLineRelationship,
  LeadSource,
} from '../../shared/schemas/enums'
import { personName } from '../../shared/utils/labels'
import { isUsablePhone, normalizePhone, phonesMatch } from '../../shared/utils/phone'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { resolveCampaignAttribution } from './campaigns'
import { DomainError } from './errors'
import { ensureEventFollowUpTask } from './follow-up'
import { insertLeadLine } from './lead-lines'
import * as leadService from './leads'
import { maybeEstablishSystemCompensation } from './compensation'
import { resolvePublicSource } from './public-trial'
import { runTransaction } from './tx'

const EVENT_STATUSES: AcquisitionEventStatus[] = ['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']
const DEFAULT_INCLUDED: EventAttendance[] = ['ATTENDED', 'NO_SHOW']

function now() {
  return new Date(utcNowMs())
}

function slugify(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!slug) {
    throw new DomainError('Event slug is required.')
  }
  return slug.slice(0, 80)
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseOptions(optionsJson: string | null): string[] {
  if (!optionsJson) {
    return []
  }
  try {
    const parsed = JSON.parse(optionsJson) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const eventWith = {
  campaign: true,
  program: true,
  sessions: { with: { program: true } },
  questions: true,
  registrations: {
    with: {
      lines: { with: { session: true } },
      answers: true,
      lead: { columns: { id: true, firstName: true, lastName: true, campaignId: true, source: true } },
      history: true,
      communicationIntents: true,
    },
  },
} as const

export async function listAcquisitionEvents(db: Database, filters?: { campaignId?: number }) {
  return db.query.acquisitionEvents.findMany({
    where: filters?.campaignId ? eq(acquisitionEvents.campaignId, filters.campaignId) : undefined,
    with: {
      campaign: true,
      program: true,
      sessions: true,
      registrations: { with: { lines: true } },
    },
    orderBy: [desc(acquisitionEvents.updatedAt)],
  })
}

export async function getAcquisitionEvent(db: Database, id: number) {
  const row = await db.query.acquisitionEvents.findFirst({
    where: eq(acquisitionEvents.id, id),
    with: eventWith,
  })
  if (!row) {
    throw new DomainError('Event not found.', 404)
  }
  const registrations = []
  for (const registration of row.registrations) {
    registrations.push({
      ...registration,
      duplicateWarnings: await registrationDuplicateWarnings(db, row.registrations, registration),
    })
  }
  return { ...row, registrations }
}

export async function getPublicEventBySlug(db: Database, slug: string) {
  const row = await db.query.acquisitionEvents.findFirst({
    where: eq(acquisitionEvents.slug, slug.trim().toLowerCase()),
    with: {
      program: true,
      sessions: { with: { program: true } },
      questions: true,
    },
  })
  if (!row || row.status !== 'PUBLISHED') {
    throw new DomainError('Event not found.', 404)
  }
  const occupancy = await occupancyBySession(db, row.sessions.map(session => session.id))
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    registrationOpensAt: row.registrationOpensAt,
    registrationClosesAt: row.registrationClosesAt,
    registrationManuallyClosed: row.registrationManuallyClosed,
    program: row.program,
    questions: row.questions.map(question => ({
      id: question.id,
      prompt: question.prompt,
      fieldType: question.fieldType as EventQuestionFieldType,
      required: question.required,
      options: parseOptions(question.optionsJson),
    })),
    sessions: row.sessions.filter(session => session.active).map(session => ({
      id: session.id,
      name: session.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      minAge: session.minAge,
      maxAge: session.maxAge,
      capacity: session.capacity,
      remaining: session.capacity == null ? null : Math.max(0, session.capacity - (occupancy.get(session.id) ?? 0)),
      program: session.program,
    })),
  }
}

async function uniqueSlug(db: Database, desired: string, excludeId?: number) {
  let slug = slugify(desired)
  let n = 2
  while (true) {
    const [existing] = await db.select({ id: acquisitionEvents.id }).from(acquisitionEvents).where(eq(acquisitionEvents.slug, slug)).limit(1)
    if (!existing || existing.id === excludeId) {
      return slug
    }
    slug = `${slugify(desired).slice(0, 70)}-${n}`
    n += 1
  }
}

export async function createAcquisitionEvent(
  db: Database,
  input: {
    title: string
    slug?: string
    description?: string | null
    status?: AcquisitionEventStatus
    campaignId?: number | null
    programId?: number | null
    registrationOpensAt?: Date | null
    registrationClosesAt?: Date | null
  },
  actor: SessionUser,
) {
  const status = input.status ?? 'DRAFT'
  if (!EVENT_STATUSES.includes(status)) {
    throw new DomainError('Invalid event status.')
  }
  const stamp = now()
  const slug = await uniqueSlug(db, input.slug || input.title)
  const [row] = await db.insert(acquisitionEvents).values({
    title: input.title.trim(),
    slug,
    description: emptyToNull(input.description),
    status,
    campaignId: input.campaignId ?? null,
    programId: input.programId ?? null,
    registrationOpensAt: input.registrationOpensAt ?? null,
    registrationClosesAt: input.registrationClosesAt ?? null,
    createdByUserId: actor.id,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return getAcquisitionEvent(db, row!.id)
}

export async function updateAcquisitionEvent(
  db: Database,
  id: number,
  input: {
    title?: string
    slug?: string
    description?: string | null
    status?: AcquisitionEventStatus
    campaignId?: number | null
    programId?: number | null
    registrationOpensAt?: Date | null
    registrationClosesAt?: Date | null
    registrationManuallyClosed?: boolean
  },
) {
  const current = await getAcquisitionEvent(db, id)
  if (input.status && !EVENT_STATUSES.includes(input.status)) {
    throw new DomainError('Invalid event status.')
  }
  if (input.status === 'PUBLISHED' && current.sessions.filter(session => session.active).length === 0) {
    throw new DomainError('Add at least one session before publishing.')
  }
  const stamp = now()
  await db.update(acquisitionEvents).set({
    title: input.title?.trim() ?? current.title,
    slug: input.slug ? await uniqueSlug(db, input.slug, id) : current.slug,
    description: input.description === undefined ? current.description : emptyToNull(input.description),
    status: input.status ?? current.status,
    campaignId: input.campaignId === undefined ? current.campaignId : input.campaignId,
    programId: input.programId === undefined ? current.programId : input.programId,
    registrationOpensAt: input.registrationOpensAt === undefined ? current.registrationOpensAt : input.registrationOpensAt,
    registrationClosesAt: input.registrationClosesAt === undefined ? current.registrationClosesAt : input.registrationClosesAt,
    registrationManuallyClosed: input.registrationManuallyClosed ?? current.registrationManuallyClosed,
    updatedAt: stamp,
  }).where(eq(acquisitionEvents.id, id))
  return getAcquisitionEvent(db, id)
}

export async function addEventSession(
  db: Database,
  eventId: number,
  input: {
    name: string
    startsAt: Date
    endsAt?: Date | null
    programId?: number | null
    minAge?: number | null
    maxAge?: number | null
    capacity?: number | null
    active?: boolean
  },
) {
  await getAcquisitionEvent(db, eventId)
  const stamp = now()
  const [row] = await db.insert(acquisitionEventSessions).values({
    eventId,
    name: input.name.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    programId: input.programId ?? null,
    minAge: input.minAge ?? null,
    maxAge: input.maxAge ?? null,
    capacity: input.capacity ?? null,
    active: input.active ?? true,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return row!
}

export async function updateEventSession(
  db: Database,
  sessionId: number,
  input: {
    name?: string
    startsAt?: Date
    endsAt?: Date | null
    programId?: number | null
    minAge?: number | null
    maxAge?: number | null
    capacity?: number | null
    active?: boolean
  },
) {
  const [session] = await db.select().from(acquisitionEventSessions).where(eq(acquisitionEventSessions.id, sessionId)).limit(1)
  if (!session) {
    throw new DomainError('Session not found.', 404)
  }
  const stamp = now()
  const [row] = await db.update(acquisitionEventSessions).set({
    name: input.name?.trim() ?? session.name,
    startsAt: input.startsAt ?? session.startsAt,
    endsAt: input.endsAt === undefined ? session.endsAt : input.endsAt,
    programId: input.programId === undefined ? session.programId : input.programId,
    minAge: input.minAge === undefined ? session.minAge : input.minAge,
    maxAge: input.maxAge === undefined ? session.maxAge : input.maxAge,
    capacity: input.capacity === undefined ? session.capacity : input.capacity,
    active: input.active ?? session.active,
    updatedAt: stamp,
  }).where(eq(acquisitionEventSessions.id, sessionId)).returning()
  return row!
}

export async function addEventQuestion(
  db: Database,
  eventId: number,
  input: {
    prompt: string
    fieldType: EventQuestionFieldType
    options?: string[]
    required?: boolean
  },
) {
  await getAcquisitionEvent(db, eventId)
  if (input.fieldType === 'SINGLE_CHOICE' && (!input.options || input.options.length < 2)) {
    throw new DomainError('Single-choice questions need at least two options.')
  }
  const existing = await db.select().from(acquisitionEventQuestions).where(eq(acquisitionEventQuestions.eventId, eventId))
  const [row] = await db.insert(acquisitionEventQuestions).values({
    eventId,
    prompt: input.prompt.trim(),
    fieldType: input.fieldType,
    optionsJson: input.options?.length ? JSON.stringify(input.options) : null,
    required: input.required ?? false,
    sortOrder: existing.length,
    createdAt: now(),
  }).returning()
  return row!
}

async function occupancyBySession(db: Database, sessionIds: number[], excludeLineId?: number) {
  const counts = new Map<number, number>()
  if (!sessionIds.length) {
    return counts
  }
  const lines = await db.select().from(acquisitionEventRegistrationLines).where(inArray(acquisitionEventRegistrationLines.sessionId, sessionIds))
  for (const line of lines) {
    if (line.attendance === 'CANCELLED' || line.id === excludeLineId) {
      continue
    }
    counts.set(line.sessionId, (counts.get(line.sessionId) ?? 0) + 1)
  }
  return counts
}

function assertAge(session: { minAge: number | null, maxAge: number | null, name: string }, age?: number | null) {
  if (age == null) {
    return
  }
  if (session.minAge != null && age < session.minAge) {
    throw new DomainError(`${session.name} is for ages ${session.minAge} and up.`)
  }
  if (session.maxAge != null && age > session.maxAge) {
    throw new DomainError(`${session.name} is for ages ${session.maxAge} and under.`)
  }
}

function assertWindow(
  event: {
    status: string
    registrationOpensAt: Date | null
    registrationClosesAt: Date | null
    registrationManuallyClosed: boolean
  },
  staffOverride: boolean,
) {
  if (event.status === 'CANCELLED') {
    throw new DomainError('This event is cancelled.')
  }
  if (!staffOverride && event.status !== 'PUBLISHED') {
    throw new DomainError('Registration is not open for this event.')
  }
  if (staffOverride) {
    return
  }
  if (event.registrationManuallyClosed) {
    throw new DomainError('Registration is closed.')
  }
  const stamp = utcNowMs()
  if (event.registrationOpensAt && event.registrationOpensAt.getTime() > stamp) {
    throw new DomainError('Registration has not opened yet.')
  }
  if (event.registrationClosesAt && event.registrationClosesAt.getTime() < stamp) {
    throw new DomainError('Registration is closed.')
  }
}

function validateAnswers(
  questions: Array<{ id: number, prompt: string, fieldType: string, required: boolean, optionsJson: string | null }>,
  answers: Array<{ questionId: number, value: string }> | undefined,
) {
  const byQuestion = new Map((answers ?? []).map(answer => [answer.questionId, answer.value.trim()]))
  const stored: Array<{ questionId: number, value: string }> = []
  for (const question of questions) {
    const value = byQuestion.get(question.id) ?? ''
    if (question.required && !value) {
      throw new DomainError(`Please answer: ${question.prompt}`)
    }
    if (!value) {
      continue
    }
    if (question.fieldType === 'YES_NO') {
      const normalized = value.toLowerCase()
      if (normalized !== 'yes' && normalized !== 'no') {
        throw new DomainError(`${question.prompt} needs Yes or No.`)
      }
      stored.push({ questionId: question.id, value: normalized === 'yes' ? 'yes' : 'no' })
      continue
    }
    if (question.fieldType === 'SINGLE_CHOICE') {
      const options = parseOptions(question.optionsJson)
      if (!options.includes(value)) {
        throw new DomainError(`${question.prompt} needs one of the listed choices.`)
      }
    }
    stored.push({ questionId: question.id, value })
  }
  return stored
}

async function loadSessionMap(db: Database, eventId: number) {
  const sessions = await db.select().from(acquisitionEventSessions).where(eq(acquisitionEventSessions.eventId, eventId))
  return new Map(sessions.map(session => [session.id, session]))
}

async function assertCapacity(
  db: Database,
  sessions: Array<{ id: number, name: string, capacity: number | null }>,
  picks: number[],
  excludeLineId?: number,
) {
  const occupancy = await occupancyBySession(db, sessions.map(session => session.id), excludeLineId)
  const extra = new Map<number, number>()
  for (const sessionId of picks) {
    extra.set(sessionId, (extra.get(sessionId) ?? 0) + 1)
  }
  for (const session of sessions) {
    if (session.capacity == null) {
      continue
    }
    const used = (occupancy.get(session.id) ?? 0) + (extra.get(session.id) ?? 0)
    if (used > session.capacity) {
      throw new DomainError(`${session.name} is full.`)
    }
  }
}

async function recordHistory(
  db: Database,
  registrationId: number,
  action: string,
  actor: SessionUser | undefined,
  details?: Record<string, unknown>,
) {
  await db.insert(acquisitionEventRegistrationHistory).values({
    registrationId,
    actorUserId: actor?.id ?? null,
    action,
    details: details ? JSON.stringify(details) : null,
    createdAt: now(),
  })
}

interface RegistrationParticipant {
  sessionId: number
  relationship?: LeadLineRelationship
  firstName: string
  lastName?: string | null
  age?: number | null
}

interface CreateRegistrationInput {
  firstName: string
  lastName?: string | null
  phone?: string | null
  email?: string | null
  source?: string | null
  campaign?: string
  trackingCode?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
  campaignId?: number | null
  notes?: string | null
  participants: RegistrationParticipant[]
  answers?: Array<{ questionId: number, value: string }>
}

async function insertRegistration(
  db: Database,
  eventId: number,
  input: CreateRegistrationInput,
  actor: SessionUser | undefined,
  staffCreated: boolean,
) {
  const event = await getAcquisitionEvent(db, eventId)
  assertWindow(event, staffCreated)
  const phone = normalizePhone(input.phone) || null
  const email = emptyToNull(input.email)?.toLowerCase() || null
  if (!phone && !email) {
    throw new DomainError('A phone number or email is required.')
  }
  if (!staffCreated && !isUsablePhone(phone)) {
    throw new DomainError('A phone number is required.')
  }
  if (!input.participants.length) {
    throw new DomainError('Add at least one participant.')
  }

  const sessionMap = await loadSessionMap(db, eventId)
  const pickedSessions = []
  for (const participant of input.participants) {
    const session = sessionMap.get(participant.sessionId)
    if (!session || !session.active) {
      throw new DomainError('That session is not available.')
    }
    assertAge(session, participant.age)
    pickedSessions.push(session)
  }
  await assertCapacity(db, pickedSessions, input.participants.map(item => item.sessionId))
  const storedAnswers = validateAnswers(event.questions, input.answers)

  const attribution = await resolveCampaignAttribution(db, {
    campaign: input.campaign,
    trackingCode: input.trackingCode,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmContent: input.utmContent,
    utmTerm: input.utmTerm,
  })
  const source = staffCreated
    ? (input.source as LeadSource | undefined) ?? null
    : resolvePublicSource(input.source ?? undefined)

  return runTransaction(db, async (tx) => {
    const stamp = now()
    const [registration] = await tx.insert(acquisitionEventRegistrations).values({
      eventId,
      contactFirstName: input.firstName.trim(),
      contactLastName: emptyToNull(input.lastName),
      phone,
      email,
      source,
      campaignId: input.campaignId ?? attribution.campaignId ?? event.campaignId,
      campaignTrackingLinkId: attribution.campaignTrackingLinkId ?? null,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmContent: attribution.utmContent,
      utmTerm: attribution.utmTerm,
      staffCreated,
      createdByUserId: actor?.id ?? null,
      notes: emptyToNull(input.notes),
      createdAt: stamp,
      updatedAt: stamp,
    }).returning()

    for (const participant of input.participants) {
      const sameAsContact = participant.firstName.trim().toLowerCase() === input.firstName.trim().toLowerCase()
        && (emptyToNull(participant.lastName)?.toLowerCase() || '') === (emptyToNull(input.lastName)?.toLowerCase() || '')
      await tx.insert(acquisitionEventRegistrationLines).values({
        registrationId: registration!.id,
        sessionId: participant.sessionId,
        relationship: participant.relationship ?? (sameAsContact ? 'SELF' : 'CHILD'),
        firstName: participant.firstName.trim(),
        lastName: emptyToNull(participant.lastName),
        age: participant.age ?? null,
        attendance: 'REGISTERED',
        createdAt: stamp,
        updatedAt: stamp,
      })
    }

    for (const answer of storedAnswers) {
      await tx.insert(acquisitionEventQuestionAnswers).values({
        registrationId: registration!.id,
        questionId: answer.questionId,
        value: answer.value,
        createdAt: stamp,
      })
    }

    await recordHistory(tx, registration!.id, 'REGISTRATION_CREATED', actor, { staffCreated })
    if (!staffCreated) {
      await tx.insert(acquisitionEventCommunicationIntents).values({
        registrationId: registration!.id,
        kind: 'CONFIRMATION',
        channel: email ? 'EMAIL' : 'SMS',
        status: 'RECORDED_INTENT',
        createdAt: stamp,
      })
    }

    return getRegistration(tx, registration!.id)
  })
}

async function getRegistration(db: Database, id: number) {
  const row = await db.query.acquisitionEventRegistrations.findFirst({
    where: eq(acquisitionEventRegistrations.id, id),
    with: {
      lines: { with: { session: true } },
      answers: true,
      history: true,
      communicationIntents: true,
      lead: { columns: { id: true, firstName: true, lastName: true, campaignId: true } },
    },
  })
  if (!row) {
    throw new DomainError('Registration not found.', 404)
  }
  return row
}

export async function registerPublicEvent(db: Database, eventId: number, input: CreateRegistrationInput) {
  return insertRegistration(db, eventId, input, undefined, false)
}

export async function registerStaffEvent(db: Database, eventId: number, input: CreateRegistrationInput, actor: SessionUser) {
  return insertRegistration(db, eventId, input, actor, true)
}

export async function updateEventRegistration(
  db: Database,
  registrationId: number,
  input: {
    firstName?: string
    lastName?: string | null
    phone?: string | null
    email?: string | null
    notes?: string | null
    excludeFromProcessing?: boolean
    source?: LeadSource | null
  },
  actor: SessionUser,
) {
  const current = await getRegistration(db, registrationId)
  const stamp = now()
  await db.update(acquisitionEventRegistrations).set({
    contactFirstName: input.firstName?.trim() ?? current.contactFirstName,
    contactLastName: input.lastName === undefined ? current.contactLastName : emptyToNull(input.lastName),
    phone: input.phone === undefined ? current.phone : (normalizePhone(input.phone) || null),
    email: input.email === undefined ? current.email : (emptyToNull(input.email)?.toLowerCase() || null),
    notes: input.notes === undefined ? current.notes : emptyToNull(input.notes),
    excludeFromProcessing: input.excludeFromProcessing ?? current.excludeFromProcessing,
    source: input.source === undefined ? current.source : input.source,
    updatedAt: stamp,
  }).where(eq(acquisitionEventRegistrations.id, registrationId))
  await recordHistory(db, registrationId, 'REGISTRATION_UPDATED', actor)
  return getRegistration(db, registrationId)
}

export async function updateEventRegistrationLine(
  db: Database,
  lineId: number,
  input: {
    sessionId?: number
    firstName?: string
    lastName?: string | null
    age?: number | null
    relationship?: LeadLineRelationship
    attendance?: EventAttendance
    notes?: string | null
  },
  actor: SessionUser,
) {
  const [line] = await db.select().from(acquisitionEventRegistrationLines).where(eq(acquisitionEventRegistrationLines.id, lineId)).limit(1)
  if (!line) {
    throw new DomainError('Participant not found.', 404)
  }
  const [registration] = await db.select().from(acquisitionEventRegistrations).where(eq(acquisitionEventRegistrations.id, line.registrationId)).limit(1)
  const sessionId = input.sessionId ?? line.sessionId
  const sessionMap = await loadSessionMap(db, registration!.eventId)
  const session = sessionMap.get(sessionId)
  if (!session) {
    throw new DomainError('That session is not available.')
  }
  assertAge(session, input.age === undefined ? line.age : input.age)
  if (input.sessionId && input.sessionId !== line.sessionId) {
    await assertCapacity(db, [session], [session.id], line.id)
  }
  const stamp = now()
  await db.update(acquisitionEventRegistrationLines).set({
    sessionId,
    firstName: input.firstName?.trim() ?? line.firstName,
    lastName: input.lastName === undefined ? line.lastName : emptyToNull(input.lastName),
    age: input.age === undefined ? line.age : input.age,
    relationship: input.relationship ?? line.relationship,
    attendance: input.attendance ?? line.attendance,
    notes: input.notes === undefined ? line.notes : emptyToNull(input.notes),
    updatedAt: stamp,
  }).where(eq(acquisitionEventRegistrationLines.id, lineId))
  await recordHistory(db, line.registrationId, 'ATTENDANCE_UPDATED', actor, { lineId, attendance: input.attendance })
  return getRegistration(db, line.registrationId)
}

function contactKey(phone: string | null, email: string | null, fallbackId: number) {
  const normalized = normalizePhone(phone)
  if (normalized) {
    return `p:${normalized}`
  }
  if (email?.trim()) {
    return `e:${email.trim().toLowerCase()}`
  }
  return `id:${fallbackId}`
}

function emailKey(value: string | null | undefined) {
  return emptyToNull(value)?.toLowerCase() ?? null
}

export function eventContactMatchKind(
  left: { phone?: string | null, email?: string | null },
  right: { phone?: string | null, email?: string | null },
): 'PHONE' | 'EMAIL' | 'BOTH' | null {
  const phoneHit = phonesMatch(left.phone, right.phone)
  const emailHit = Boolean(emailKey(left.email) && emailKey(left.email) === emailKey(right.email))
  if (phoneHit && emailHit) {
    return 'BOTH'
  }
  if (phoneHit) {
    return 'PHONE'
  }
  if (emailHit) {
    return 'EMAIL'
  }
  return null
}

function registrationContactName(row: { contactFirstName?: string, firstName?: string, contactLastName?: string | null, lastName?: string | null }) {
  return personName({
    firstName: row.contactFirstName || row.firstName,
    lastName: row.contactLastName ?? row.lastName,
  })
}

type DuplicateWarning = {
  kind: 'EVENT_REGISTRATION' | 'CRM_HOUSEHOLD'
  matchKind: 'PHONE' | 'EMAIL' | 'BOTH'
  registrationId?: number
  leadId?: number
  label: string
}

function eventRegistrationDuplicateWarnings(
  registrations: Array<{
    id: number
    contactFirstName: string
    contactLastName: string | null
    phone: string | null
    email: string | null
    leadId: number | null
  }>,
  registration: { id: number, phone: string | null, email: string | null },
): DuplicateWarning[] {
  const warnings: DuplicateWarning[] = []
  for (const other of registrations) {
    if (other.id === registration.id) {
      continue
    }
    const matchKind = eventContactMatchKind(registration, other)
    if (!matchKind) {
      continue
    }
    warnings.push({
      kind: 'EVENT_REGISTRATION',
      matchKind,
      registrationId: other.id,
      leadId: other.leadId ?? undefined,
      label: registrationContactName(other),
    })
  }
  return warnings
}

async function registrationDuplicateWarnings(
  db: Database,
  registrations: Array<{
    id: number
    contactFirstName: string
    contactLastName: string | null
    phone: string | null
    email: string | null
    leadId: number | null
  }>,
  registration: { id: number, phone: string | null, email: string | null, leadId?: number | null },
): Promise<DuplicateWarning[]> {
  const warnings = eventRegistrationDuplicateWarnings(registrations, registration)
  const matches = await leadService.findMatchingContactLeads(db, {
    phone: registration.phone,
    email: registration.email,
    excludeId: registration.leadId ?? undefined,
  })
  for (const match of matches) {
    warnings.push({
      kind: 'CRM_HOUSEHOLD',
      matchKind: match.matchKind,
      leadId: match.id,
      label: personName(match),
    })
  }
  return warnings
}

function namesMatch(left: { firstName: string, lastName: string | null }, right: { firstName: string, lastName?: string | null }) {
  return left.firstName.trim().toLowerCase() === right.firstName.trim().toLowerCase()
    && (left.lastName || '').trim().toLowerCase() === (right.lastName || '').trim().toLowerCase()
}

interface BatchOptions {
  excludeRegistrationIds?: number[]
  includeCancelledRegistrationIds?: number[]
  forceNewRegistrationIds?: number[]
  confirmations?: Array<{ registrationId: number, leadId: number }>
}

function isIncluded(
  registration: { id: number, excludeFromProcessing: boolean, lines: Array<{ attendance: string }> },
  options: BatchOptions,
) {
  if (registration.excludeFromProcessing || options.excludeRegistrationIds?.includes(registration.id)) {
    return false
  }
  const includeCancelled = options.includeCancelledRegistrationIds?.includes(registration.id)
  return registration.lines.some((line) => {
    if (DEFAULT_INCLUDED.includes(line.attendance as EventAttendance)) {
      return true
    }
    return includeCancelled && line.attendance === 'CANCELLED'
  })
}

function includedLines<T extends { attendance: string }>(
  registration: { id: number, lines: T[] },
  options: BatchOptions,
) {
  const includeCancelled = options.includeCancelledRegistrationIds?.includes(registration.id)
  return registration.lines.filter((line) => {
    if (DEFAULT_INCLUDED.includes(line.attendance as EventAttendance)) {
      return true
    }
    return includeCancelled && line.attendance === 'CANCELLED'
  })
}

async function programIdFor(
  db: Database,
  session: { programId: number | null },
  event: { programId: number | null },
) {
  if (session.programId) {
    return session.programId
  }
  if (event.programId) {
    return event.programId
  }
  const [adult] = await db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ')).limit(1)
  if (!adult) {
    throw new DomainError('Program not found.', 404)
  }
  return adult.id
}

function presentPreviewRegistrations<T extends {
  id: number
  contactFirstName: string
  contactLastName: string | null
  phone: string | null
  email: string | null
  processedAt: Date | string | null
  leadId: number | null
  duplicateWarnings?: DuplicateWarning[]
  lines: Array<{
    firstName: string
    lastName: string | null
    attendance: string
    sessionId: number
    session?: { name: string } | null
  }>
}>(group: T[], options: BatchOptions) {
  return group.map(registration => ({
    id: registration.id,
    contactName: registrationContactName(registration),
    phone: registration.phone,
    email: registration.email,
    processed: Boolean(registration.processedAt || registration.leadId),
    leadId: registration.leadId,
    participants: includedLines(registration, options).map(line => ({
      name: personName(line),
      attendance: line.attendance,
      sessionName: line.session?.name ?? null,
    })),
    duplicateWarnings: registration.duplicateWarnings ?? [],
  }))
}

function groupIsForceNew(
  group: Array<{ id: number }>,
  options: BatchOptions,
) {
  return group.some(item => options.forceNewRegistrationIds?.includes(item.id))
}

function proposedActionLabel(
  outcome: 'NEW' | 'MATCH' | 'AMBIGUOUS' | 'ALREADY_PROCESSED',
  matches: Array<{ id: number, firstName: string, lastName: string | null }>,
  confirmedLeadId: number | null,
) {
  if (outcome === 'ALREADY_PROCESSED') {
    return 'Already processed. One Event Follow-Up call stays on this household.'
  }
  if (outcome === 'NEW' && matches.length) {
    return 'Create a new household despite possible duplicates.'
  }
  if (outcome === 'NEW') {
    return 'Create a new household.'
  }
  if (outcome === 'AMBIGUOUS') {
    return 'Choose an existing household, or create a new one.'
  }
  const match = matches.find(item => item.id === confirmedLeadId) ?? matches[0]
  return match
    ? `Match to ${personName(match)} household.`
    : 'Match to an existing household.'
}

export async function previewEventBatch(db: Database, eventId: number, options: BatchOptions = {}) {
  const event = await getAcquisitionEvent(db, eventId)
  const included = event.registrations.filter(registration => isIncluded(registration, options))
  const excluded = event.registrations.filter(registration => !isIncluded(registration, options))
  const confirmationByReg = new Map((options.confirmations ?? []).map(item => [item.registrationId, item.leadId]))
  const groups = new Map<string, typeof included>()
  for (const registration of included) {
    const key = contactKey(registration.phone, registration.email, registration.id)
    const list = groups.get(key) ?? []
    list.push(registration)
    groups.set(key, list)
  }

  let newHouseholds = 0
  let existingMatches = 0
  let ambiguous = 0
  let followUps = 0
  const rows: Array<{
    key: string
    outcome: 'NEW' | 'MATCH' | 'AMBIGUOUS' | 'ALREADY_PROCESSED'
    registrationIds: number[]
    registrations: ReturnType<typeof presentPreviewRegistrations>
    matches: Array<{ id: number, firstName: string, lastName: string | null, matchKind: 'PHONE' | 'EMAIL' | 'BOTH' }>
    confirmedLeadId: number | null
    proposedAction: string
    forceNew: boolean
  }> = []

  for (const [key, group] of groups) {
    const already = group.map(item => item.leadId).find((value): value is number => Boolean(value))
    const forceNew = !already && groupIsForceNew(group, options)
    const presented = presentPreviewRegistrations(group, options)
    if (already && group.every(item => item.leadId === already && item.lines.every(line => !includedLines(item, options).length || line.leadLineId))) {
      existingMatches += 1
      followUps += 1
      rows.push({
        key,
        outcome: 'ALREADY_PROCESSED',
        registrationIds: group.map(item => item.id),
        registrations: presented,
        matches: [],
        confirmedLeadId: already,
        proposedAction: proposedActionLabel('ALREADY_PROCESSED', [], already),
        forceNew: false,
      })
      continue
    }
    const confirmed = forceNew
      ? undefined
      : group.map(item => confirmationByReg.get(item.id)).find((value): value is number => Boolean(value))
    const sample = group[0]!
    const matches = already
      ? []
      : await leadService.findMatchingContactLeads(db, { phone: sample.phone, email: sample.email })
    if (forceNew) {
      newHouseholds += 1
      followUps += 1
      rows.push({
        key,
        outcome: 'NEW',
        registrationIds: group.map(item => item.id),
        registrations: presented,
        matches,
        confirmedLeadId: null,
        proposedAction: proposedActionLabel('NEW', matches, null),
        forceNew: true,
      })
      continue
    }
    if (already || confirmed) {
      existingMatches += 1
      followUps += 1
      const confirmedLeadId = already ?? confirmed ?? null
      rows.push({
        key,
        outcome: 'MATCH',
        registrationIds: group.map(item => item.id),
        registrations: presented,
        matches,
        confirmedLeadId,
        proposedAction: proposedActionLabel('MATCH', matches, confirmedLeadId),
        forceNew: false,
      })
      continue
    }
    if (matches.length > 1) {
      ambiguous += 1
      rows.push({
        key,
        outcome: 'AMBIGUOUS',
        registrationIds: group.map(item => item.id),
        registrations: presented,
        matches,
        confirmedLeadId: null,
        proposedAction: proposedActionLabel('AMBIGUOUS', matches, null),
        forceNew: false,
      })
      continue
    }
    if (matches.length === 1) {
      existingMatches += 1
      followUps += 1
      rows.push({
        key,
        outcome: 'MATCH',
        registrationIds: group.map(item => item.id),
        registrations: presented,
        matches,
        confirmedLeadId: matches[0]!.id,
        proposedAction: proposedActionLabel('MATCH', matches, matches[0]!.id),
        forceNew: false,
      })
      continue
    }
    newHouseholds += 1
    followUps += 1
    rows.push({
      key,
      outcome: 'NEW',
      registrationIds: group.map(item => item.id),
      registrations: presented,
      matches: [],
      confirmedLeadId: null,
      proposedAction: proposedActionLabel('NEW', [], null),
      forceNew: false,
    })
  }

  return {
    eventId,
    registrations: included.length,
    newHouseholds,
    existingMatches,
    ambiguous,
    excluded: excluded.length,
    followUpTasksToCreate: followUps,
    rows,
    excludedRows: presentPreviewRegistrations(excluded, options).map((row, index) => ({
      ...row,
      reason: excluded[index]?.excludeFromProcessing ? 'Excluded from processing' : 'Cancelled / not included',
    })),
    excludedRegistrationIds: excluded.map(item => item.id),
  }
}

export async function executeEventBatch(db: Database, eventId: number, options: BatchOptions, actor: SessionUser) {
  const preview = await previewEventBatch(db, eventId, options)

  return runTransaction(db, async (tx) => {
    const event = await getAcquisitionEvent(tx, eventId)
    const included = event.registrations.filter(registration => isIncluded(registration, options))
    const confirmationByReg = new Map((options.confirmations ?? []).map(item => [item.registrationId, item.leadId]))
    const groups = new Map<string, typeof included>()
    for (const registration of included) {
      const key = contactKey(registration.phone, registration.email, registration.id)
      const list = groups.get(key) ?? []
      list.push(registration)
      groups.set(key, list)
    }

    const createdLeadIds: number[] = []
    let followUpsCreated = 0

    for (const group of groups.values()) {
      const sample = group[0]!
      const already = group.map(item => item.leadId).find((value): value is number => Boolean(value))
      const forceNew = !already && groupIsForceNew(group, options)
      const confirmed = forceNew
        ? undefined
        : group.map(item => confirmationByReg.get(item.id)).find((value): value is number => Boolean(value))
      const matches = already
        ? []
        : await leadService.findMatchingContactLeads(tx, { phone: sample.phone, email: sample.email })
      let leadId = already ?? null
      if (!forceNew && !leadId && matches.length > 1) {
        if (!confirmed || !matches.some(match => match.id === confirmed)) {
          throw new DomainError('Ambiguous household matches need an explicit choice before processing.')
        }
        leadId = confirmed
      }
      if (!forceNew && !leadId && matches.length === 1) {
        leadId = matches[0]!.id
      }
      if (!forceNew && !leadId && confirmed) {
        throw new DomainError('Confirmed household was not one of the contact matches.')
      }

      const pendingLines = group.flatMap(item => includedLines(item, options).filter(line => !line.leadLineId))
      if (leadId && !pendingLines.length && group.every(item => item.leadId === leadId)) {
        const linkedIds = group.flatMap(item => includedLines(item, options).map(line => line.leadLineId).filter((value): value is number => Boolean(value)))
        await ensureEventFollowUpTask(tx, {
          leadId,
          eventId: event.id,
          leadLineIds: linkedIds,
          notes: `Event follow-up for ${event.title}.`,
        })
        followUpsCreated += 1
        continue
      }

      const firstLine = includedLines(sample, options)[0]
      const firstSession = event.sessions.find(session => session.id === firstLine?.sessionId) ?? event.sessions[0]
      if (!firstSession) {
        throw new DomainError('This event has no sessions.')
      }
      const headerProgramId = await programIdFor(tx, firstSession, event)
      let preservedCampaignId: number | null = null
      if (!leadId) {
        const header = await leadService.createLead(tx, {
          firstName: sample.contactFirstName,
          lastName: sample.contactLastName,
          phone: sample.phone,
          email: sample.email,
          programId: headerProgramId,
          source: (sample.source as LeadSource | undefined) || 'WEBSITE',
          campaignId: sample.campaignId,
          campaignTrackingLinkId: sample.campaignTrackingLinkId,
          utmSource: sample.utmSource,
          utmMedium: sample.utmMedium,
          utmContent: sample.utmContent,
          utmTerm: sample.utmTerm,
        }, actor, { skipDefaultLine: true })
        leadId = header.id
        createdLeadIds.push(leadId)
        if (matches.length) {
          await leadService.recordPossibleDuplicates(tx, leadId, matches)
        }
      } else {
        const [found] = await tx.select({
          id: leads.id,
          campaignId: leads.campaignId,
        }).from(leads).where(eq(leads.id, leadId)).limit(1)
        if (!found) {
          throw new DomainError('Confirmed household was not found.')
        }
        preservedCampaignId = found.campaignId
      }

      const householdLines = await tx.select().from(leadLines).where(eq(leadLines.leadId, leadId))
      const processedLineIds: number[] = []
      const attendanceNotes: string[] = []

      for (const registration of group) {
        const lines = includedLines(registration, options)
        for (const line of lines) {
          if (line.leadLineId) {
            processedLineIds.push(line.leadLineId)
            attendanceNotes.push(`${line.firstName}: ${line.attendance}`)
            continue
          }
          const session = event.sessions.find(item => item.id === line.sessionId)
          if (!session) {
            throw new DomainError('Participant session is missing.')
          }
          const existingLine = householdLines.find(item => namesMatch(item, line))
          let leadLineId = existingLine?.id
          if (!leadLineId) {
            const created = await insertLeadLine(tx, leadId, {
              relationship: (line.relationship as LeadLineRelationship) || 'CHILD',
              firstName: line.firstName,
              lastName: line.lastName,
              age: line.age,
              programId: await programIdFor(tx, session, event),
              notes: `Event: ${event.title}. Attendance: ${line.attendance}.`,
            }, actor)
            leadLineId = created.id
            householdLines.push(created)
            await maybeEstablishSystemCompensation(tx, leadLineId, {
              campaignId: registration.campaignId,
              campaignTrackingLinkId: registration.campaignTrackingLinkId,
              eventId: event.id,
            })
          }
          processedLineIds.push(leadLineId)
          attendanceNotes.push(`${line.firstName}: ${line.attendance}`)
          await tx.update(acquisitionEventRegistrationLines).set({
            leadLineId,
            updatedAt: now(),
          }).where(eq(acquisitionEventRegistrationLines.id, line.id))
        }

        await tx.update(acquisitionEventRegistrations).set({
          leadId,
          processedAt: now(),
          updatedAt: now(),
        }).where(eq(acquisitionEventRegistrations.id, registration.id))
        await recordHistory(tx, registration.id, 'PROCESSED', actor, { leadId, preservedCampaignId })
      }

      await tx.insert(leadNotes).values({
        leadId,
        body: `Acquisition Event “${event.title}”: ${attendanceNotes.join('; ') || 'processed'}. Event attendance is not a Trial.`,
        createdByUserId: actor.id,
        createdAt: now(),
        updatedAt: now(),
      })

      await ensureEventFollowUpTask(tx, {
        leadId,
        eventId: event.id,
        leadLineIds: processedLineIds,
        notes: `Event follow-up for ${event.title}. ${attendanceNotes.join('; ')}`,
      })
      followUpsCreated += 1
    }

    return {
      preview,
      createdLeadIds,
      followUpsCreated,
    }
  })
}
