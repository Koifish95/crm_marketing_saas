import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from '../database'
import { followUpTaskLines, leadLineLostOutcomes, leadLineStatusHistory, leadLines, leads, membershipOfferings, programs, trials } from '../database/schema'
import type { LeadLineRelationship, LeadStatus } from '../../shared/schemas/enums'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import { assertStatusChange } from './lead-status'

export const TERMINAL_LINE_STATUSES: LeadStatus[] = ['JOINED', 'LOST']

export interface CreateLeadLineInput {
  relationship: LeadLineRelationship
  firstName: string
  lastName?: string | null
  dateOfBirth?: Date | null
  age?: number | null
  programId: number
  experienceLevel?: string
  notes?: string | null
  status?: LeadStatus
  membershipOfferingId?: number | null
  monthlyOverrideCents?: number | null
  discountReason?: string | null
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

async function resolveOffering(
  db: Database,
  programId: number,
  offeringId: number | null | undefined,
  currentOfferingId?: number | null,
) {
  if (offeringId == null) {
    return null
  }
  const [offering] = await db.select().from(membershipOfferings).where(eq(membershipOfferings.id, offeringId)).limit(1)
  if (!offering) {
    throw new DomainError('Membership offering not found.', 404)
  }
  if (offering.programId !== programId) {
    throw new DomainError('That offering does not belong to this program.')
  }
  if (!offering.active && offering.id !== currentOfferingId) {
    throw new DomainError('That offering is no longer available for new conversions.')
  }
  return offering
}

export function isTerminalLineStatus(status: string) {
  return TERMINAL_LINE_STATUSES.includes(status as LeadStatus)
}

export function householdIsClosed(lines: Array<{ status: string }>) {
  return lines.length > 0 && lines.every(line => isTerminalLineStatus(line.status))
}

export const DUPLICATE_SELF_MESSAGE = 'This household already has a primary contact (Self). Additional people must be Child, Spouse, or Other.'

async function assertSingleSelfLine(
  db: Database,
  leadId: number,
  relationship: string,
  exceptLineId?: number,
) {
  if (relationship !== 'SELF') {
    return
  }
  const existing = await db.select().from(leadLines).where(eq(leadLines.leadId, leadId))
  if (existing.some(line => line.relationship === 'SELF' && line.id !== exceptLineId)) {
    throw new DomainError(DUPLICATE_SELF_MESSAGE)
  }
}

export function linesFromCreateLeadInput(input: {
  firstName: string
  lastName?: string | null
  programId: number
  experienceLevel?: string
  participantFirstName?: string | null
  participantLastName?: string | null
  participantAge?: number | null
  status?: LeadStatus
}): CreateLeadLineInput[] {
  const childName = emptyToNull(input.participantFirstName)
  if (childName) {
    return [{
      relationship: 'CHILD',
      firstName: childName,
      lastName: emptyToNull(input.participantLastName),
      age: input.participantAge ?? null,
      programId: input.programId,
      experienceLevel: input.experienceLevel ?? 'UNKNOWN',
      status: input.status ?? 'NEW',
    }]
  }
  return [{
    relationship: 'SELF',
    firstName: input.firstName.trim(),
    lastName: emptyToNull(input.lastName),
    programId: input.programId,
    experienceLevel: input.experienceLevel ?? 'UNKNOWN',
    status: input.status ?? 'NEW',
  }]
}

export async function insertLeadLine(
  db: Database,
  leadId: number,
  input: CreateLeadLineInput,
  actor?: SessionUser,
) {
  const [program] = await db.select().from(programs).where(eq(programs.id, input.programId)).limit(1)
  if (!program) {
    throw new DomainError('Program not found.', 404)
  }
  await resolveOffering(db, input.programId, input.membershipOfferingId)
  await assertSingleSelfLine(db, leadId, input.relationship)

  const now = new Date(utcNowMs())
  const status = input.status ?? 'NEW'
  const [line] = await db.insert(leadLines).values({
    leadId,
    relationship: input.relationship,
    firstName: input.firstName.trim(),
    lastName: emptyToNull(input.lastName),
    dateOfBirth: input.dateOfBirth ?? null,
    age: input.age ?? null,
    programId: input.programId,
    experienceLevel: input.experienceLevel ?? 'UNKNOWN',
    notes: emptyToNull(input.notes),
    status,
    membershipOfferingId: input.membershipOfferingId ?? null,
    monthlyOverrideCents: input.monthlyOverrideCents ?? null,
    discountReason: emptyToNull(input.discountReason),
    createdAt: now,
    updatedAt: now,
  }).returning()

  await db.insert(leadLineStatusHistory).values({
    leadLineId: line!.id,
    leadId,
    fromStatus: null,
    toStatus: status,
    changedByUserId: actor?.id,
    note: 'Prospective member added.',
    createdAt: now,
  })

  await syncHeaderClosure(db, leadId)
  return line!
}

export async function listLeadLines(db: Database, leadId: number) {
  return db.query.leadLines.findMany({
    where: eq(leadLines.leadId, leadId),
    with: { program: true, trials: true, statusHistory: true, membershipOffering: true },
  })
}

export async function resolveTrialLine(
  db: Database,
  leadId: number,
  leadLineId?: number | null,
) {
  const lines = await db.select().from(leadLines).where(eq(leadLines.leadId, leadId))
  if (leadLineId) {
    const match = lines.find(line => line.id === leadLineId)
    if (!match) {
      throw new DomainError('That prospective member is not part of this household.')
    }
    return match
  }
  return lines.find(line => line.relationship === 'CHILD')
    ?? lines.find(line => line.relationship === 'SELF')
    ?? lines[0]
    ?? null
}

export async function applyLeadLineStatus(
  db: Database,
  lineId: number,
  input: { toStatus: LeadStatus, note?: string },
  actor?: SessionUser,
) {
  const [line] = await db.select().from(leadLines).where(eq(leadLines.id, lineId)).limit(1)
  if (!line) {
    throw new DomainError('Prospective member not found.', 404)
  }

  const fromStatus = line.status as LeadStatus
  if (fromStatus === input.toStatus) {
    return line
  }
  assertStatusChange(fromStatus, input.toStatus, input.note)

  const now = new Date(utcNowMs())
  await db.update(leadLines).set({
    status: input.toStatus,
    updatedAt: now,
  }).where(eq(leadLines.id, lineId))
  await db.insert(leadLineStatusHistory).values({
    leadLineId: lineId,
    leadId: line.leadId,
    fromStatus,
    toStatus: input.toStatus,
    changedByUserId: actor?.id,
    note: input.note?.trim() || null,
    createdAt: now,
  })

  if (fromStatus === 'LOST' && input.toStatus !== 'LOST') {
    await db.update(leadLineLostOutcomes).set({
      reopenedAt: now,
      reopenedByUserId: actor?.id ?? null,
    }).where(and(
      eq(leadLineLostOutcomes.leadLineId, lineId),
      isNull(leadLineLostOutcomes.reopenedAt),
    ))
  }

  await syncHeaderClosure(db, line.leadId)
  const [updated] = await db.select().from(leadLines).where(eq(leadLines.id, lineId)).limit(1)
  return updated!
}

export async function changeLeadLineStatus(
  db: Database,
  lineId: number,
  input: { toStatus: LeadStatus, note?: string },
  actor?: SessionUser,
) {
  if (input.toStatus === 'JOINED') {
    throw new DomainError('Convert this prospective member instead of setting Joined on the pipeline.')
  }
  if (input.toStatus === 'LOST') {
    throw new DomainError('Mark this person lost with a lost reason.')
  }
  return applyLeadLineStatus(db, lineId, input, actor)
}

export async function syncHeaderClosure(db: Database, leadId: number) {
  const lines = await db.select().from(leadLines).where(eq(leadLines.leadId, leadId))
  const now = new Date(utcNowMs())
  await db.update(leads).set({
    closedAt: householdIsClosed(lines) ? now : null,
    updatedAt: now,
  }).where(eq(leads.id, leadId))
}

export async function addLeadLineToHousehold(
  db: Database,
  leadId: number,
  input: CreateLeadLineInput,
  actor?: SessionUser,
) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) {
    throw new DomainError('Lead not found.', 404)
  }
  return insertLeadLine(db, leadId, input, actor)
}

export async function updateLeadLine(
  db: Database,
  lineId: number,
  input: Partial<CreateLeadLineInput>,
) {
  const [line] = await db.select().from(leadLines).where(eq(leadLines.id, lineId)).limit(1)
  if (!line) {
    throw new DomainError('Prospective member not found.', 404)
  }
  const nextProgramId = input.programId ?? line.programId
  if (input.programId) {
    const [program] = await db.select().from(programs).where(eq(programs.id, input.programId)).limit(1)
    if (!program) {
      throw new DomainError('Program not found.', 404)
    }
  }
  const nextOfferingId = input.membershipOfferingId !== undefined ? input.membershipOfferingId : line.membershipOfferingId
  await resolveOffering(db, nextProgramId, nextOfferingId, line.membershipOfferingId)
  await assertSingleSelfLine(db, line.leadId, input.relationship ?? line.relationship, line.id)

  const now = new Date(utcNowMs())
  await db.update(leadLines).set({
    relationship: input.relationship ?? line.relationship,
    firstName: input.firstName?.trim() ?? line.firstName,
    lastName: input.lastName !== undefined ? emptyToNull(input.lastName) : line.lastName,
    dateOfBirth: input.dateOfBirth !== undefined ? input.dateOfBirth : line.dateOfBirth,
    age: input.age !== undefined ? input.age : line.age,
    programId: input.programId ?? line.programId,
    experienceLevel: input.experienceLevel ?? line.experienceLevel,
    notes: input.notes !== undefined ? emptyToNull(input.notes) : line.notes,
    membershipOfferingId: input.membershipOfferingId !== undefined ? input.membershipOfferingId : line.membershipOfferingId,
    monthlyOverrideCents: input.monthlyOverrideCents !== undefined ? input.monthlyOverrideCents : line.monthlyOverrideCents,
    discountReason: input.discountReason !== undefined ? emptyToNull(input.discountReason) : line.discountReason,
    updatedAt: now,
  }).where(eq(leadLines.id, lineId))

  const [updated] = await db.select().from(leadLines).where(eq(leadLines.id, lineId)).limit(1)
  return updated!
}

export async function removeLeadLine(db: Database, lineId: number) {
  const [line] = await db.select().from(leadLines).where(eq(leadLines.id, lineId)).limit(1)
  if (!line) {
    throw new DomainError('Prospective member not found.', 404)
  }

  const siblings = await db.select().from(leadLines).where(eq(leadLines.leadId, line.leadId))
  if (siblings.length <= 1) {
    throw new DomainError('A household needs at least one prospective member.')
  }

  const [trial] = await db.select().from(trials).where(eq(trials.leadLineId, lineId)).limit(1)
  if (trial) {
    throw new DomainError('Remove or reassign intros before deleting this prospective member.')
  }

  await db.delete(followUpTaskLines).where(eq(followUpTaskLines.leadLineId, lineId))
  await db.delete(leadLineStatusHistory).where(eq(leadLineStatusHistory.leadLineId, lineId))
  await db.delete(leadLines).where(eq(leadLines.id, lineId))
  await syncHeaderClosure(db, line.leadId)
}
