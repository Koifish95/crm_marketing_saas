import { and, asc, desc, eq, gte, inArray, like, or } from 'drizzle-orm'
import type { Database } from '../database'
import {
  acquisitionEvents,
  campaigns,
  compensationAttributionHistory,
  compensationAttributions,
  compensationEarned,
  conversions,
  leadLines,
  leadNotes,
  leadPossibleDuplicates,
  leadStatusHistory,
  leads,
  programs,
  trials,
} from '../database/schema'
import type { ContactMatchKind, HouseholdStatusFilter, LeadSource, LeadStatus } from '../../shared/schemas/enums'
import { householdDisplayStatus, nextHouseholdIntro, personName } from '../../shared/utils/labels'
import { normalizePhone, phonesMatch } from '../../shared/utils/phone'
import { utcNowMs } from '../../shared/utils/time'
import {
  canRecordScheduledTrialOutcome,
  EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE,
  INVALID_TRIAL_OUTCOME_MESSAGE,
  mayRecordTrialOutcome,
} from '../../shared/utils/trial-outcomes'
import { DomainError } from './errors'
import { getAllowEarlyTrialOutcomes } from './app-settings'
import { assertStatusChange } from './lead-status'
import type { SessionUser } from './authorization'
import { getBookableSlot } from './availability'
import { convertLeadLine, markLeadLineLost } from './conversion'
import * as followUp from './follow-up'
import {
  changeLeadLineStatus,
  insertLeadLine,
  isTerminalLineStatus,
  linesFromCreateLeadInput,
  resolveTrialLine,
  syncHeaderClosure,
} from './lead-lines'
import { runTransaction } from './tx'

export interface CreateLeadInput {
  firstName: string
  lastName?: string | null
  phone?: string | null
  email?: string | null
  programId: number
  experienceLevel?: string
  source: LeadSource
  status?: LeadStatus
  participantFirstName?: string | null
  participantLastName?: string | null
  participantAge?: number | null
  guardianRelationship?: string | null
  campaignId?: number | null
  campaignTrackingLinkId?: number | null
  utmSource?: string | null
  utmMedium?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  smsConsent?: boolean
  emailConsent?: boolean
}

export interface ListLeadFilters {
  search?: string
  status?: HouseholdStatusFilter
  programId?: number
  source?: LeadSource
  campaignId?: number
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export interface ContactLeadMatch {
  id: number
  firstName: string
  lastName: string | null
  matchKind: ContactMatchKind
}

export async function findMatchingContactLeads(
  db: Database,
  options: { phone?: string | null, email?: string | null, excludeId?: number },
): Promise<ContactLeadMatch[]> {
  const wantPhone = normalizePhone(options.phone)
  const wantEmail = emptyToNull(options.email)?.toLowerCase()
  if (!wantPhone && !wantEmail) {
    return []
  }

  const rows = await db.select({
    id: leads.id,
    firstName: leads.firstName,
    lastName: leads.lastName,
    phone: leads.phone,
    email: leads.email,
  }).from(leads)

  const matches: ContactLeadMatch[] = []
  for (const row of rows) {
    if (row.id === options.excludeId) {
      continue
    }
    const phoneHit = Boolean(wantPhone && phonesMatch(row.phone, wantPhone))
    const emailHit = Boolean(wantEmail && emptyToNull(row.email)?.toLowerCase() === wantEmail)
    if (!phoneHit && !emailHit) {
      continue
    }
    matches.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      matchKind: phoneHit && emailHit ? 'BOTH' : phoneHit ? 'PHONE' : 'EMAIL',
    })
  }
  return matches
}

export async function findDuplicateLeads(
  db: Database,
  options: { phone?: string | null, email?: string | null, excludeId?: number },
) {
  const matches = await findMatchingContactLeads(db, options)
  if (!matches.length) {
    return []
  }
  const ids = matches.map(match => match.id)
  const rows = await db.query.leads.findMany({
    where: inArray(leads.id, ids),
    with: { program: true },
    orderBy: [desc(leads.createdAt)],
    limit: 20,
  })
  const kindById = new Map(matches.map(match => [match.id, match.matchKind]))
  return rows.map(row => ({
    ...row,
    matchKind: kindById.get(row.id) ?? 'PHONE',
  }))
}

export async function recordPossibleDuplicates(
  db: Database,
  leadId: number,
  matches: ContactLeadMatch[],
  detectedAt = new Date(utcNowMs()),
) {
  if (!matches.length) {
    return []
  }
  return db.insert(leadPossibleDuplicates).values(matches.map(match => ({
    leadId,
    matchedLeadId: match.id,
    matchKind: match.matchKind,
    matchedDisplayName: personName(match),
    detectedAt,
  }))).returning()
}

export async function listPossibleDuplicatesForLeads(db: Database, leadIds: number[]) {
  if (!leadIds.length) {
    return []
  }
  return db.select().from(leadPossibleDuplicates).where(inArray(leadPossibleDuplicates.leadId, leadIds))
}

export async function listLeads(db: Database, filters: ListLeadFilters = {}) {
  const conditions = []
  if (filters.source) {
    conditions.push(eq(leads.source, filters.source))
  }
  if (filters.campaignId) {
    conditions.push(eq(leads.campaignId, filters.campaignId))
  }
  if (filters.programId) {
    const matchingLines = await db.select({ leadId: leadLines.leadId })
      .from(leadLines)
      .where(eq(leadLines.programId, filters.programId))
    const leadIds = [...new Set(matchingLines.map(row => row.leadId))]
    if (!leadIds.length) {
      return []
    }
    conditions.push(inArray(leads.id, leadIds))
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    const matchingLines = await db.select({ leadId: leadLines.leadId })
      .from(leadLines)
      .where(or(
        like(leadLines.firstName, term),
        like(leadLines.lastName, term),
      ))
    const lineLeadIds = [...new Set(matchingLines.map(row => row.leadId))]
    const searchParts = [
      like(leads.firstName, term),
      like(leads.lastName, term),
      like(leads.phone, term),
      like(leads.email, term),
      like(leads.participantFirstName, term),
    ]
    if (lineLeadIds.length) {
      searchParts.push(inArray(leads.id, lineLeadIds))
    }
    conditions.push(or(...searchParts))
  }

  const rows = await db.query.leads.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: {
      program: true,
      campaign: true,
      trials: true,
      lines: {
        with: { program: true },
      },
    },
    orderBy: [desc(leads.createdAt)],
  })

  const nowMs = utcNowMs()
  const presented = rows.map(row => ({
    ...row,
    nextTrial: nextHouseholdIntro(row, nowMs),
  }))
  const filtered = filters.status
    ? presented.filter(row => householdDisplayStatus(row).key === filters.status)
    : presented
  const duplicateRows = await listPossibleDuplicatesForLeads(db, filtered.map(row => row.id))
  const duplicatesByLead = new Map<number, typeof duplicateRows>()
  for (const row of duplicateRows) {
    const current = duplicatesByLead.get(row.leadId) ?? []
    current.push(row)
    duplicatesByLead.set(row.leadId, current)
  }
  return filtered.map(row => ({
    ...row,
    possibleDuplicateMatches: duplicatesByLead.get(row.id) ?? [],
  }))
}

function trialScheduledAtMs(scheduledAt: Date | string | number) {
  return scheduledAt instanceof Date ? scheduledAt.getTime() : new Date(scheduledAt).getTime()
}

function withTrialOutcomeCapability<T extends { status: string, scheduledAt: Date | string }>(
  trial: T,
  allowEarlyTrialOutcomes: boolean,
  nowMs: number,
) {
  return {
    ...trial,
    canRecordTrialOutcome: canRecordScheduledTrialOutcome({
      trialStatus: trial.status,
      allowEarlyTrialOutcomes,
      scheduledAtMs: trialScheduledAtMs(trial.scheduledAt),
      nowMs,
    }),
  }
}

type HouseholdAcquisitionEvent = {
  id: number
  title: string
  sessions: Array<{ id: number, name: string }>
}

async function mergeHouseholdAcquisitionEvents(
  db: Database,
  registrations: Array<{
    event?: { id: number, title: string } | null
    lines: Array<{ session?: { id: number, name: string } | null }>
  }>,
  extraEventIds: number[],
) {
  const byId = new Map<number, HouseholdAcquisitionEvent>()

  function addEvent(id: number, title: string, sessions: Array<{ id: number, name: string }> = []) {
    const existing = byId.get(id)
    if (!existing) {
      byId.set(id, { id, title, sessions: [...sessions] })
      return
    }
    for (const session of sessions) {
      if (!existing.sessions.some(item => item.id === session.id)) {
        existing.sessions.push(session)
      }
    }
  }

  for (const registration of registrations) {
    if (!registration.event) {
      continue
    }
    addEvent(
      registration.event.id,
      registration.event.title,
      registration.lines
        .map(line => line.session)
        .filter((session): session is { id: number, name: string } => Boolean(session)),
    )
  }

  const missing = [...new Set(extraEventIds.filter(eventId => !byId.has(eventId)))]
  if (missing.length) {
    const rows = await db.query.acquisitionEvents.findMany({
      where: inArray(acquisitionEvents.id, missing),
      columns: { id: true, title: true },
    })
    for (const row of rows) {
      addEvent(row.id, row.title)
    }
  }

  return [...byId.values()]
}

export async function getLead(db: Database, id: number, options?: { nowMs?: number }) {
  const lead = await db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: {
      program: true,
      campaign: true,
      trackingLink: { columns: { id: true, label: true } },
      eventRegistrations: {
        with: {
          event: { columns: { id: true, title: true } },
          lines: {
            with: {
              session: { columns: { id: true, name: true } },
            },
          },
        },
      },
      trials: true,
      notes: true,
      statusHistory: true,
      lines: {
        with: {
          program: true,
          trials: true,
          statusHistory: true,
          membershipOffering: true,
          conversions: true,
          lostOutcomes: {
            with: { lostReason: true },
          },
        },
      },
      followUpTasks: {
        with: {
          assignedUser: true,
          completedBy: true,
          trial: true,
          lineLinks: {
            with: {
              leadLine: {
                with: {
                  program: true,
                  trials: true,
                },
              },
            },
          },
        },
      },
    },
  })
  if (!lead) {
    throw new DomainError('Lead not found.', 404)
  }

  const duplicates = await findDuplicateLeads(db, {
    phone: lead.phone,
    email: lead.email,
    excludeId: lead.id,
  })
  const possibleDuplicateMatches = await listPossibleDuplicatesForLeads(db, [lead.id])
  const nowMs = options?.nowMs ?? utcNowMs()
  const allowEarlyTrialOutcomes = await getAllowEarlyTrialOutcomes(db)
  const lineIds = lead.lines.map(line => line.id)
  const attributions = lineIds.length
    ? await db.query.compensationAttributions.findMany({
        where: inArray(compensationAttributions.leadLineId, lineIds),
        with: {
          creditedUser: { columns: { id: true, displayName: true, role: true } },
          campaign: { columns: { id: true, name: true } },
          event: { columns: { id: true, title: true } },
          history: {
            with: {
              actor: { columns: { id: true, displayName: true, role: true } },
            },
            orderBy: [desc(compensationAttributionHistory.createdAt)],
          },
        },
      })
    : []
  const attributionByLineId = new Map(attributions.map(row => [row.leadLineId, row]))
  const earnedRows = lineIds.length
    ? await db.query.compensationEarned.findMany({
        where: inArray(compensationEarned.leadLineId, lineIds),
        orderBy: [desc(compensationEarned.earnedAt)],
      })
    : []
  const earnedByLineId = new Map<number, typeof earnedRows>()
  for (const row of earnedRows) {
    const current = earnedByLineId.get(row.leadLineId) ?? []
    current.push(row)
    earnedByLineId.set(row.leadLineId, current)
  }

  const extraEventIds = [
    ...lead.followUpTasks.map(task => task.sourceEventId).filter((eventId): eventId is number => eventId != null),
    ...attributions.map(row => row.eventId).filter((eventId): eventId is number => eventId != null),
  ]
  const { eventRegistrations, ...household } = lead
  const householdAcquisitionEvents = await mergeHouseholdAcquisitionEvents(db, eventRegistrations, extraEventIds)

  return {
    ...household,
    trials: lead.trials.map(trial => withTrialOutcomeCapability(trial, allowEarlyTrialOutcomes, nowMs)),
    lines: lead.lines.map(line => ({
      ...line,
      trials: line.trials.map(trial => withTrialOutcomeCapability(trial, allowEarlyTrialOutcomes, nowMs)),
      compensationAttribution: attributionByLineId.get(line.id) ?? null,
      compensationEarned: earnedByLineId.get(line.id) ?? [],
    })),
    followUpTasks: lead.followUpTasks
      .map(task => followUp.presentFollowUpTask(task, nowMs))
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
    acquisitionEvents: householdAcquisitionEvents,
    duplicates,
    possibleDuplicateMatches,
  }
}

export async function createLead(
  db: Database,
  input: CreateLeadInput,
  actor?: SessionUser,
  options?: { skipDefaultLine?: boolean },
) {
  const now = new Date(utcNowMs())
  const phone = emptyToNull(input.phone)
  const email = emptyToNull(input.email)?.toLowerCase()
  if (!phone && !email) {
    throw new DomainError('A lead requires a phone number or an email address.')
  }

  const [program] = await db.select().from(programs).where(eq(programs.id, input.programId)).limit(1)
  if (!program) {
    throw new DomainError('Program not found.', 404)
  }

  if (input.campaignId) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1)
    if (!campaign) {
      throw new DomainError('Campaign not found.', 404)
    }
  }

  const status = input.status ?? 'NEW'
  const [lead] = await db.insert(leads).values({
    firstName: input.firstName.trim(),
    lastName: emptyToNull(input.lastName),
    phone,
    email,
    programId: input.programId,
    experienceLevel: input.experienceLevel ?? 'UNKNOWN',
    source: input.source,
    status,
    participantFirstName: emptyToNull(input.participantFirstName),
    participantLastName: emptyToNull(input.participantLastName),
    participantAge: input.participantAge,
    guardianRelationship: emptyToNull(input.guardianRelationship),
    campaignId: input.campaignId,
    campaignTrackingLinkId: input.campaignTrackingLinkId ?? null,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmContent: input.utmContent ?? null,
    utmTerm: input.utmTerm ?? null,
    smsConsent: input.smsConsent ?? false,
    smsConsentAt: input.smsConsent ? now : null,
    emailConsent: input.emailConsent ?? false,
    emailConsentAt: input.emailConsent ? now : null,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await db.insert(leadStatusHistory).values({
    leadId: lead!.id,
    fromStatus: null,
    toStatus: status,
    changedByUserId: actor?.id,
    note: 'Lead created.',
    createdAt: now,
  })

  if (!options?.skipDefaultLine) {
    for (const line of linesFromCreateLeadInput({ ...input, status })) {
      await insertLeadLine(db, lead!.id, line, actor)
    }
  }

  return getLead(db, lead!.id)
}

export async function updateLead(db: Database, id: number, input: Partial<CreateLeadInput>) {
  const existing = await db.query.leads.findFirst({ where: eq(leads.id, id) })
  if (!existing) {
    throw new DomainError('Lead not found.', 404)
  }

  const now = new Date(utcNowMs())
  const nextPhone = input.phone !== undefined ? emptyToNull(input.phone) : existing.phone
  const nextEmail = input.email !== undefined ? emptyToNull(input.email)?.toLowerCase() ?? null : existing.email
  if (!nextPhone && !nextEmail) {
    throw new DomainError('A lead requires a phone number or an email address.')
  }

  await db.update(leads).set({
    firstName: input.firstName?.trim() ?? existing.firstName,
    lastName: input.lastName !== undefined ? emptyToNull(input.lastName) : existing.lastName,
    phone: nextPhone,
    email: nextEmail,
    programId: input.programId ?? existing.programId,
    experienceLevel: input.experienceLevel ?? existing.experienceLevel,
    source: input.source ?? existing.source,
    participantFirstName: input.participantFirstName !== undefined ? emptyToNull(input.participantFirstName) : existing.participantFirstName,
    participantLastName: input.participantLastName !== undefined ? emptyToNull(input.participantLastName) : existing.participantLastName,
    participantAge: input.participantAge !== undefined ? input.participantAge : existing.participantAge,
    guardianRelationship: input.guardianRelationship !== undefined ? emptyToNull(input.guardianRelationship) : existing.guardianRelationship,
    campaignId: input.campaignId !== undefined ? input.campaignId : existing.campaignId,
    smsConsent: input.smsConsent ?? existing.smsConsent,
    smsConsentAt: input.smsConsent === true ? now : existing.smsConsentAt,
    emailConsent: input.emailConsent ?? existing.emailConsent,
    emailConsentAt: input.emailConsent === true ? now : existing.emailConsentAt,
    updatedAt: now,
  }).where(eq(leads.id, id))

  return getLead(db, id)
}

export async function changeLeadStatus(
  db: Database,
  id: number,
  input: { toStatus: LeadStatus, note?: string, joinedAt?: Date, monthlyRateCents?: number, lostReasonId?: number },
  actor?: SessionUser,
) {
  const existing = await db.query.leads.findFirst({ where: eq(leads.id, id) })
  if (!existing) {
    throw new DomainError('Lead not found.', 404)
  }

  const fromStatus = existing.status as LeadStatus
  assertStatusChange(fromStatus, input.toStatus, input.note)

  if (input.toStatus === 'JOINED' && input.monthlyRateCents === undefined && existing.monthlyRateCents == null) {
    throw new DomainError('Joined leads require a monthly rate.')
  }

  const lines = await db.select().from(leadLines).where(eq(leadLines.leadId, id))
  if ((input.toStatus === 'JOINED' || input.toStatus === 'LOST') && lines.length !== 1) {
    throw new DomainError('Convert or mark lost each prospective member separately.')
  }

  if (input.toStatus === 'JOINED' && lines[0]) {
    await convertLeadLine(db, lines[0].id, {
      joinedAt: input.joinedAt,
      note: input.note,
      monthlyCents: input.monthlyRateCents,
    }, actor)
    const now = new Date(utcNowMs())
    await db.update(leads).set({
      status: 'JOINED',
      joinedAt: input.joinedAt ?? now,
      monthlyRateCents: input.monthlyRateCents ?? existing.monthlyRateCents,
      updatedAt: now,
    }).where(eq(leads.id, id))
    await db.insert(leadStatusHistory).values({
      leadId: id,
      fromStatus,
      toStatus: 'JOINED',
      changedByUserId: actor?.id,
      note: input.note?.trim() || null,
      createdAt: now,
    })
    return getLead(db, id)
  }

  if (input.toStatus === 'LOST' && lines[0]) {
    if (!input.lostReasonId) {
      throw new DomainError('A lost reason is required.')
    }
    await markLeadLineLost(db, lines[0].id, { lostReasonId: input.lostReasonId, note: input.note }, actor)
    const now = new Date(utcNowMs())
    await db.update(leads).set({
      status: 'LOST',
      updatedAt: now,
    }).where(eq(leads.id, id))
    await db.insert(leadStatusHistory).values({
      leadId: id,
      fromStatus,
      toStatus: 'LOST',
      changedByUserId: actor?.id,
      note: input.note?.trim() || null,
      createdAt: now,
    })
    return getLead(db, id)
  }

  const now = new Date(utcNowMs())
  await db.update(leads).set({
    status: input.toStatus,
    updatedAt: now,
    joinedAt: existing.joinedAt,
    monthlyRateCents: existing.monthlyRateCents,
  }).where(eq(leads.id, id))
  await db.insert(leadStatusHistory).values({
    leadId: id,
    fromStatus,
    toStatus: input.toStatus,
    changedByUserId: actor?.id,
    note: input.note?.trim() || null,
    createdAt: now,
  })
  if (lines.length === 1 && lines[0]) {
    await changeLeadLineStatus(db, lines[0].id, { toStatus: input.toStatus, note: input.note }, actor)
  }
  await syncHeaderClosure(db, id)

  return getLead(db, id)
}

export async function addLeadNote(db: Database, id: number, body: string, actor?: SessionUser) {
  const existing = await db.query.leads.findFirst({ where: eq(leads.id, id) })
  if (!existing) {
    throw new DomainError('Lead not found.', 404)
  }

  const now = new Date(utcNowMs())
  await db.insert(leadNotes).values({
    leadId: id,
    body: body.trim(),
    createdByUserId: actor?.id,
    createdAt: now,
    updatedAt: now,
  })

  return getLead(db, id)
}

async function loadLeadWithProgram(db: Database, leadId: number) {
  const lead = await db.query.leads.findFirst({
    where: eq(leads.id, leadId),
    with: { program: true },
  })
  if (!lead?.program) {
    throw new DomainError('Lead not found.', 404)
  }
  return lead
}

async function resolveBookableIntroSlot(
  db: Database,
  line: { programId: number, age: number | null },
  programCode: string,
  slotId: string,
  nowMs?: number,
) {
  if (programCode !== 'ADULT_BJJ' && programCode !== 'KIDS_BJJ') {
    throw new DomainError('That intro time is not available.')
  }

  const slot = await getBookableSlot(db, slotId, {
    nowMs,
    age: programCode === 'KIDS_BJJ' ? line.age ?? undefined : undefined,
  })
  if (slot.programId !== line.programId) {
    throw new DomainError('That intro time is not available.')
  }
  return slot
}

export async function scheduleTrialFromSlot(
  db: Database,
  leadId: number,
  input: { slotId: string, notes?: string, leadLineId?: number },
  actor?: SessionUser,
  options?: { nowMs?: number },
) {
  return runTransaction(db, async (tx) => {
    const lead = await loadLeadWithProgram(tx, leadId)
    const line = await resolveTrialLine(tx, leadId, input.leadLineId)
    if (!line) {
      throw new DomainError('Add a prospective member before scheduling an intro.')
    }
    const [program] = await tx.select().from(programs).where(eq(programs.id, line.programId)).limit(1)
    const slot = await resolveBookableIntroSlot(tx, line, program?.code ?? lead.program.code, input.slotId, options?.nowMs)
    const nowMs = options?.nowMs ?? utcNowMs()
    return createTrial(tx, leadId, {
      scheduledAt: new Date(slot.scheduledAt),
      label: `${slot.name} · ${slot.date}`,
      notes: input.notes,
      leadLineId: line.id,
    }, actor, { nowMs, skipTransaction: true })
  })
}

export async function createTrial(
  db: Database,
  leadId: number,
  input: { scheduledAt: Date, label?: string, notes?: string, leadLineId?: number },
  actor?: SessionUser,
  options?: { nowMs?: number, skipTransaction?: boolean },
) {
  const work = async (tx: Database) => {
    const existing = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) })
    if (!existing) {
      throw new DomainError('Lead not found.', 404)
    }

    const line = await resolveTrialLine(tx, leadId, input.leadLineId)
    if (line && isTerminalLineStatus(line.status)) {
      if (line.status === 'JOINED') {
        throw new DomainError('Reverse the conversion before scheduling another intro.')
      }
      throw new DomainError('Reopen this person before scheduling another intro.')
    }

    const nowMs = options?.nowMs ?? utcNowMs()
    const now = new Date(nowMs)
    const [trial] = await tx.insert(trials).values({
      leadId,
      leadLineId: line?.id ?? null,
      scheduledAt: input.scheduledAt,
      label: emptyToNull(input.label),
      notes: emptyToNull(input.notes),
      status: 'SCHEDULED',
      createdAt: now,
      updatedAt: now,
    }).returning()

    await followUp.ensureInitialFollowUpTask(tx, {
      leadId,
      trialId: trial!.id,
      leadLineId: line?.id,
    }, nowMs)

    const autoScheduleFrom = ['NEW', 'CONTACTED', 'RESPONDED', 'NO_SHOW', 'TRIAL_ATTENDED']
    if (autoScheduleFrom.includes(existing.status)) {
      await changeLeadStatus(tx, leadId, {
        toStatus: 'TRIAL_SCHEDULED',
        note: 'Trial scheduled.',
      }, actor)
    }
    if (line && autoScheduleFrom.includes(line.status) && line.status !== 'TRIAL_SCHEDULED') {
      await changeLeadLineStatus(tx, line.id, {
        toStatus: 'TRIAL_SCHEDULED',
        note: 'Trial scheduled.',
      }, actor)
    }

    return getLead(tx, leadId)
  }

  if (options?.skipTransaction) {
    return work(db)
  }
  return runTransaction(db, work)
}

export async function setTrialOutcome(
  db: Database,
  trialId: number,
  input: { status: 'ATTENDED' | 'NO_SHOW' | 'CANCELLED', notes?: string },
  actor?: SessionUser,
  options?: { nowMs?: number },
) {
  return runTransaction(db, async (tx) => {
    const trial = await tx.query.trials.findFirst({ where: eq(trials.id, trialId) })
    if (!trial) {
      throw new DomainError('Trial not found.', 404)
    }

    const nowMs = options?.nowMs ?? utcNowMs()
    if (input.status === 'ATTENDED' || input.status === 'NO_SHOW') {
      if (trial.status !== 'SCHEDULED') {
        throw new DomainError(INVALID_TRIAL_OUTCOME_MESSAGE)
      }
      const allowEarlyTrialOutcomes = await getAllowEarlyTrialOutcomes(tx)
      if (!mayRecordTrialOutcome({
        allowEarlyTrialOutcomes,
        scheduledAtMs: trial.scheduledAt.getTime(),
        nowMs,
      })) {
        throw new DomainError(EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE)
      }
    }

    const now = new Date(nowMs)
    await tx.update(trials).set({
      status: input.status,
      notes: input.notes !== undefined ? emptyToNull(input.notes) : trial.notes,
      updatedAt: now,
    }).where(eq(trials.id, trialId))

    await followUp.cancelPendingInitialFollowUp(tx, trialId, nowMs)

    const line = trial.leadLineId
      ? (await tx.select().from(leadLines).where(eq(leadLines.id, trial.leadLineId)).limit(1))[0] ?? null
      : null
    const lineIsTerminal = Boolean(line && isTerminalLineStatus(line.status))

    const lead = await tx.query.leads.findFirst({ where: eq(leads.id, trial.leadId) })
    if (lead && lead.status !== 'JOINED' && lead.status !== 'LOST' && !lineIsTerminal) {
      if (input.status === 'ATTENDED' && lead.status !== 'TRIAL_ATTENDED') {
        await changeLeadStatus(tx, trial.leadId, {
          toStatus: 'TRIAL_ATTENDED',
          note: input.notes || 'Trial attended.',
        }, actor)
      }
      if (input.status === 'NO_SHOW' && lead.status !== 'NO_SHOW') {
        await changeLeadStatus(tx, trial.leadId, {
          toStatus: 'NO_SHOW',
          note: input.notes || 'Trial no-show.',
        }, actor)
      }
    }

    if (line && !lineIsTerminal && (input.status === 'ATTENDED' || input.status === 'NO_SHOW')) {
      const lineStatus = input.status === 'ATTENDED' ? 'TRIAL_ATTENDED' : 'NO_SHOW'
      await changeLeadLineStatus(tx, line.id, {
        toStatus: lineStatus,
        note: input.notes || (input.status === 'ATTENDED' ? 'Trial attended.' : 'Trial no-show.'),
      }, actor)
    }

    return getLead(tx, trial.leadId, { nowMs })
  })
}

export async function rescheduleTrial(
  db: Database,
  trialId: number,
  input: { slotId: string, notes?: string },
  actor?: SessionUser,
  options?: { nowMs?: number },
) {
  return runTransaction(db, async (tx) => {
    const trial = await tx.query.trials.findFirst({ where: eq(trials.id, trialId) })
    if (!trial) {
      throw new DomainError('Trial not found.', 404)
    }

    const lead = await loadLeadWithProgram(tx, trial.leadId)
    const line = await resolveTrialLine(tx, trial.leadId, trial.leadLineId)
    if (!line) {
      throw new DomainError('Add a prospective member before scheduling an intro.')
    }
    const [program] = await tx.select().from(programs).where(eq(programs.id, line.programId)).limit(1)
    const slot = await resolveBookableIntroSlot(tx, line, program?.code ?? lead.program.code, input.slotId, options?.nowMs)

    const nowMs = options?.nowMs ?? utcNowMs()
    const now = new Date(nowMs)
    await tx.update(trials).set({
      status: 'CANCELLED',
      notes: trial.notes ? `${trial.notes}\nRescheduled.` : 'Rescheduled.',
      updatedAt: now,
    }).where(eq(trials.id, trialId))

    return createTrial(tx, trial.leadId, {
      scheduledAt: new Date(slot.scheduledAt),
      label: `${slot.name} · ${slot.date}`,
      notes: input.notes,
      leadLineId: line.id,
    }, actor, { nowMs, skipTransaction: true })
  })
}

export async function dashboardStats(db: Database, options?: { includeFinancial?: boolean }) {
  const now = utcNowMs()
  const allLeads = await db.select().from(leads)
  const allLines = await db.select().from(leadLines)
  const allConversions = await db.select().from(conversions)
  const followUpSummary = await followUp.followUpDashboard(db, now)

  const byStatus: Record<string, number> = {}
  for (const lead of allLeads) {
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1
  }

  const { isInCurrentBusinessMonth } = await import('../../shared/utils/time')

  const householdsThisMonth = allLeads.filter(lead => isInCurrentBusinessMonth(lead.createdAt.getTime(), now)).length
  const prospectiveMembersThisMonth = allLines.filter(line => isInCurrentBusinessMonth(line.createdAt.getTime(), now)).length
  const attendedThisMonth = new Set(
    (await db.select().from(trials))
      .filter(trial => trial.status === 'ATTENDED' && isInCurrentBusinessMonth(trial.updatedAt.getTime(), now) && trial.leadLineId)
      .map(trial => trial.leadLineId),
  ).size
  const monthConversions = allConversions.filter(row =>
    !row.reversedAt && isInCurrentBusinessMonth(row.joinedAt.getTime(), now),
  )
  const newMrrCents = monthConversions.reduce((sum, row) => sum + row.monthlyCents, 0)

  const upcomingTrialRows = await db
    .select({
      id: trials.id,
      leadId: trials.leadId,
      scheduledAt: trials.scheduledAt,
      label: trials.label,
      firstName: leads.firstName,
      lastName: leads.lastName,
    })
    .from(trials)
    .innerJoin(leads, eq(trials.leadId, leads.id))
    .where(and(eq(trials.status, 'SCHEDULED'), gte(trials.scheduledAt, new Date(now))))
    .orderBy(asc(trials.scheduledAt))
    .limit(8)

  return {
    totalLeads: allLeads.length,
    newLeads: byStatus.NEW ?? 0,
    leadsThisMonth: householdsThisMonth,
    householdsThisMonth,
    prospectiveMembersThisMonth,
    attendedThisMonth,
    byStatus,
    upcomingTrials: upcomingTrialRows.map(row => ({
      id: row.id,
      leadId: row.leadId,
      scheduledAt: row.scheduledAt,
      label: row.label,
      lead: { firstName: row.firstName, lastName: row.lastName },
    })),
    overdueTasks: followUpSummary.overdueTasks,
    followUp: followUpSummary,
    joinsThisMonth: monthConversions.length,
    conversionsThisMonth: monthConversions.length,
    newMrrCents: options?.includeFinancial === false ? null : newMrrCents,
    includeFinancial: options?.includeFinancial !== false,
  }
}

export async function listPrograms(db: Database) {
  return db.select().from(programs).orderBy(programs.name)
}

export async function listCampaigns(db: Database) {
  return db.select().from(campaigns).orderBy(campaigns.name)
}
