import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from '../database'
import {
  conversions,
  leadLineLostOutcomes,
  leadLines,
  lostReasons,
  membershipOfferings,
} from '../database/schema'
import type { LeadStatus } from '../../shared/schemas/enums'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import { forecastHousehold } from './forecast'
import { cancelObsoleteFollowUpForLine } from './follow-up'
import { applyLeadLineStatus, updateLeadLine } from './lead-lines'
import { snapshotCompensationEarned } from './compensation'
import { runTransaction } from './tx'

export async function convertLeadLine(
  db: Database,
  lineId: number,
  input: {
    joinedAt?: Date
    note?: string
    monthlyCents?: number
    enrollmentCents?: number
    membershipOfferingId?: number
  },
  actor?: SessionUser,
) {
  return runTransaction(db, async (tx) => {
    const [existing] = await tx.select().from(leadLines).where(eq(leadLines.id, lineId)).limit(1)
    if (!existing) {
      throw new DomainError('Prospective member not found.', 404)
    }
    if (existing.status === 'JOINED') {
      throw new DomainError('That person already has an active conversion.')
    }

    const [active] = await tx.select().from(conversions).where(and(
      eq(conversions.leadLineId, lineId),
      isNull(conversions.reversedAt),
    )).limit(1)
    if (active) {
      throw new DomainError('That person already has an active conversion.')
    }

    const line = input.membershipOfferingId != null
      ? await updateLeadLine(tx, lineId, { membershipOfferingId: input.membershipOfferingId })
      : existing

    const forecast = await forecastHousehold(tx, line.leadId)
    const lineForecast = forecast.lines.find(row => row.leadLineId === lineId)
    const monthlyCents = input.monthlyCents ?? lineForecast?.forecastMonthlyCents ?? 0
    const enrollmentCents = input.enrollmentCents ?? lineForecast?.enrollmentCents ?? 0
    if (!Number.isInteger(monthlyCents) || monthlyCents < 0 || !Number.isInteger(enrollmentCents) || enrollmentCents < 0) {
      throw new DomainError('Conversion amounts must be integer cents.')
    }
    if (line.membershipOfferingId == null && input.monthlyCents == null && monthlyCents === 0) {
      throw new DomainError('Select an offering before converting this person.')
    }

    let offeringName: string | null = null
    if (line.membershipOfferingId) {
      const [offering] = await tx.select().from(membershipOfferings).where(eq(membershipOfferings.id, line.membershipOfferingId)).limit(1)
      offeringName = offering?.name ?? null
    }

    const now = new Date(utcNowMs())
    const joinedAt = input.joinedAt ?? now
    const [row] = await tx.insert(conversions).values({
      leadLineId: lineId,
      leadId: line.leadId,
      programId: line.programId,
      membershipOfferingId: line.membershipOfferingId,
      offeringName,
      joinedAt,
      monthlyCents,
      enrollmentCents,
      discountReason: line.discountReason,
      overridden: lineForecast?.overridden ?? line.monthlyOverrideCents != null,
      note: input.note?.trim() || null,
      convertedByUserId: actor?.id,
      createdAt: now,
      updatedAt: now,
    }).returning()

    await applyLeadLineStatus(tx, lineId, { toStatus: 'JOINED', note: input.note || 'Converted.' }, actor)
    await cancelObsoleteFollowUpForLine(
      tx,
      line.leadId,
      lineId,
      'Cancelled because this person joined.',
    )
    await snapshotCompensationEarned(tx, row!.id)
    return row!
  })
}

export async function reverseConversion(
  db: Database,
  conversionId: number,
  input: { note: string, toStatus?: LeadStatus },
  actor: SessionUser,
) {
  if (actor.role !== 'ADMIN') {
    throw new DomainError('Only an admin can reverse a conversion.', 403)
  }
  const note = input.note.trim()
  if (!note) {
    throw new DomainError('Reversing a conversion requires a note.')
  }

  const [row] = await db.select().from(conversions).where(eq(conversions.id, conversionId)).limit(1)
  if (!row) {
    throw new DomainError('Conversion not found.', 404)
  }
  if (row.reversedAt) {
    throw new DomainError('That conversion was already reversed.')
  }

  const now = new Date(utcNowMs())
  await db.update(conversions).set({
    reversedAt: now,
    reversedByUserId: actor.id,
    reverseNote: note,
    updatedAt: now,
  }).where(eq(conversions.id, conversionId))

  const toStatus = input.toStatus ?? 'TRIAL_ATTENDED'
  if (toStatus === 'JOINED' || toStatus === 'LOST') {
    throw new DomainError('Choose a non-terminal status when reversing a conversion.')
  }
  await applyLeadLineStatus(db, row.leadLineId, { toStatus, note }, actor)
  return db.select().from(conversions).where(eq(conversions.id, conversionId)).then(rows => rows[0]!)
}

export async function markLeadLineLost(
  db: Database,
  lineId: number,
  input: { lostReasonId: number, note?: string },
  actor?: SessionUser,
) {
  const [line] = await db.select().from(leadLines).where(eq(leadLines.id, lineId)).limit(1)
  if (!line) {
    throw new DomainError('Prospective member not found.', 404)
  }
  const [reason] = await db.select().from(lostReasons).where(eq(lostReasons.id, input.lostReasonId)).limit(1)
  if (!reason || !reason.active) {
    throw new DomainError('Choose an active lost reason.')
  }
  if (line.status === 'JOINED') {
    throw new DomainError('Reverse the conversion before marking this person lost.')
  }
  const [activeConversion] = await db.select().from(conversions).where(and(
    eq(conversions.leadLineId, lineId),
    isNull(conversions.reversedAt),
  )).limit(1)
  if (activeConversion) {
    throw new DomainError('Reverse the conversion before marking this person lost.')
  }

  const now = new Date(utcNowMs())
  await db.insert(leadLineLostOutcomes).values({
    leadLineId: lineId,
    leadId: line.leadId,
    lostReasonId: input.lostReasonId,
    note: input.note?.trim() || null,
    createdByUserId: actor?.id,
    createdAt: now,
  })

  await applyLeadLineStatus(db, lineId, {
    toStatus: 'LOST',
    note: input.note?.trim() || reason.name,
  }, actor)
  await cancelObsoleteFollowUpForLine(
    db,
    line.leadId,
    lineId,
    'Cancelled because this person was marked lost.',
  )
}

export async function listActiveConversion(db: Database, lineId: number) {
  const [row] = await db.select().from(conversions).where(and(
    eq(conversions.leadLineId, lineId),
    isNull(conversions.reversedAt),
  )).limit(1)
  return row ?? null
}
