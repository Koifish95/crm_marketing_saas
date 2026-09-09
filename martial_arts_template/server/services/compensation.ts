import { desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import {
  appSettings,
  compensationAttributionHistory,
  compensationAttributions,
  compensationEarned,
  conversions,
  leadLines,
  users,
} from '../database/schema'
import type {
  CompensationEligibility,
  CompensationMethod,
  CompensationOrigin,
} from '../../shared/schemas/enums'
import {
  COMPENSATION_BASIS_KEY,
  COMPENSATION_BASIS_PERCENT_OF_MONTHLY,
  COMPENSATION_BPS_KEY,
  COMPENSATION_DEFAULT_BPS,
  compensationAmountCents,
} from '../../shared/utils/compensation'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { getTrackedAcquisitionOwnerUserId } from './app-settings'
import { DomainError } from './errors'

function now() {
  return new Date(utcNowMs())
}

export async function ensureCompensationSettings(db: Database) {
  const stamp = now()
  const keys = [
    { key: COMPENSATION_BASIS_KEY, value: COMPENSATION_BASIS_PERCENT_OF_MONTHLY },
    { key: COMPENSATION_BPS_KEY, value: String(COMPENSATION_DEFAULT_BPS) },
  ]
  for (const item of keys) {
    const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, item.key)).limit(1)
    if (!existing) {
      await db.insert(appSettings).values({
        key: item.key,
        value: item.value,
        updatedAt: stamp,
        updatedByUserId: null,
      })
    }
  }
}

export async function getCompensationConfig(db: Database) {
  await ensureCompensationSettings(db)
  const rows = await db.select().from(appSettings)
  const map = new Map(rows.map(row => [row.key, row.value]))
  const basis = map.get(COMPENSATION_BASIS_KEY) || COMPENSATION_BASIS_PERCENT_OF_MONTHLY
  const bps = Number.parseInt(map.get(COMPENSATION_BPS_KEY) || String(COMPENSATION_DEFAULT_BPS), 10)
  return {
    basis,
    basisBps: Number.isInteger(bps) && bps >= 0 ? bps : COMPENSATION_DEFAULT_BPS,
  }
}

async function writeHistory(
  db: Database,
  input: {
    leadLineId: number
    attributionId: number | null
    creditedUserId: number | null
    campaignId: number | null
    campaignTrackingLinkId: number | null
    eventId: number | null
    method: CompensationMethod
    origin: CompensationOrigin
    eligibility: CompensationEligibility
    reason?: string | null
    actorUserId?: number | null
  },
) {
  await db.insert(compensationAttributionHistory).values({
    leadLineId: input.leadLineId,
    attributionId: input.attributionId,
    creditedUserId: input.creditedUserId,
    campaignId: input.campaignId,
    campaignTrackingLinkId: input.campaignTrackingLinkId,
    eventId: input.eventId,
    method: input.method,
    origin: input.origin,
    eligibility: input.eligibility,
    reason: input.reason ?? null,
    actorUserId: input.actorUserId ?? null,
    createdAt: now(),
  })
}

export async function getCompensationAttribution(db: Database, leadLineId: number) {
  return db.query.compensationAttributions.findFirst({
    where: eq(compensationAttributions.leadLineId, leadLineId),
    with: {
      creditedUser: { columns: { id: true, displayName: true, role: true } },
      campaign: true,
    },
  })
}

export async function maybeEstablishSystemCompensation(
  db: Database,
  leadLineId: number,
  evidence: {
    campaignId?: number | null
    campaignTrackingLinkId?: number | null
    eventId?: number | null
  },
) {
  const existing = await getCompensationAttribution(db, leadLineId)
  if (existing) {
    return existing
  }
  if (!evidence.campaignId && !evidence.campaignTrackingLinkId && !evidence.eventId) {
    return null
  }
  const creditedUserId = evidence.campaignTrackingLinkId
    ? await getTrackedAcquisitionOwnerUserId(db)
    : null
  const method: CompensationMethod = evidence.eventId
    ? 'EVENT'
    : evidence.campaignTrackingLinkId
      ? 'TRACKING_LINK'
      : 'CAMPAIGN'
  const eligibility: CompensationEligibility = creditedUserId ? 'ELIGIBLE' : 'UNASSIGNED'
  const stamp = now()
  const [row] = await db.insert(compensationAttributions).values({
    leadLineId,
    creditedUserId,
    campaignId: evidence.campaignId ?? null,
    campaignTrackingLinkId: evidence.campaignTrackingLinkId ?? null,
    eventId: evidence.eventId ?? null,
    establishedAt: stamp,
    method,
    origin: 'SYSTEM',
    eligibility,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  await writeHistory(db, {
    leadLineId,
    attributionId: row!.id,
    creditedUserId,
    campaignId: evidence.campaignId ?? null,
    campaignTrackingLinkId: evidence.campaignTrackingLinkId ?? null,
    eventId: evidence.eventId ?? null,
    method,
    origin: 'SYSTEM',
    eligibility,
    reason: evidence.campaignTrackingLinkId
      ? 'Established from generated tracking-link evidence.'
      : 'Established from qualifying acquisition evidence without a generated tracking link.',
  })
  return row!
}

export async function assignCompensationAttribution(
  db: Database,
  leadLineId: number,
  input: { creditedUserId: number | null, reason: string, eligibility?: CompensationEligibility },
  actor: SessionUser,
) {
  const reason = input.reason.trim()
  if (reason.length < 3) {
    throw new DomainError('A correction reason is required.')
  }
  const [line] = await db.select().from(leadLines).where(eq(leadLines.id, leadLineId)).limit(1)
  if (!line) {
    throw new DomainError('Prospective member not found.', 404)
  }
  if (input.creditedUserId) {
    const [user] = await db.select().from(users).where(eq(users.id, input.creditedUserId)).limit(1)
    if (!user) {
      throw new DomainError('Credited user not found.', 404)
    }
  }
  const existing = await getCompensationAttribution(db, leadLineId)
  const eligibility = input.eligibility
    ?? (input.creditedUserId ? 'ELIGIBLE' : 'UNASSIGNED')
  const stamp = now()
  if (!existing) {
    const [row] = await db.insert(compensationAttributions).values({
      leadLineId,
      creditedUserId: input.creditedUserId,
      establishedAt: stamp,
      method: 'MANUAL',
      origin: 'MANUAL',
      eligibility,
      createdAt: stamp,
      updatedAt: stamp,
    }).returning()
    await writeHistory(db, {
      leadLineId,
      attributionId: row!.id,
      creditedUserId: input.creditedUserId,
      campaignId: null,
      campaignTrackingLinkId: null,
      eventId: null,
      method: 'MANUAL',
      origin: 'MANUAL',
      eligibility,
      reason,
      actorUserId: actor.id,
    })
    return getCompensationAttribution(db, leadLineId)
  }
  await db.update(compensationAttributions).set({
    creditedUserId: input.creditedUserId,
    method: 'MANUAL',
    origin: 'MANUAL',
    eligibility,
    updatedAt: stamp,
  }).where(eq(compensationAttributions.id, existing.id))
  await writeHistory(db, {
    leadLineId,
    attributionId: existing.id,
    creditedUserId: input.creditedUserId,
    campaignId: existing.campaignId,
    campaignTrackingLinkId: existing.campaignTrackingLinkId,
    eventId: existing.eventId,
    method: 'MANUAL',
    origin: 'MANUAL',
    eligibility,
    reason,
    actorUserId: actor.id,
  })
  return getCompensationAttribution(db, leadLineId)
}

export async function snapshotCompensationEarned(db: Database, conversionId: number) {
  const [conversion] = await db.select().from(conversions).where(eq(conversions.id, conversionId)).limit(1)
  if (!conversion || conversion.reversedAt) {
    return null
  }
  const [already] = await db.select().from(compensationEarned).where(eq(compensationEarned.conversionId, conversionId)).limit(1)
  if (already) {
    return already
  }
  const attribution = await getCompensationAttribution(db, conversion.leadLineId)
  if (!attribution?.creditedUserId || attribution.eligibility !== 'ELIGIBLE') {
    return null
  }
  const config = await getCompensationConfig(db)
  const amountCents = compensationAmountCents(conversion.monthlyCents, config.basisBps)
  const stamp = now()
  const [row] = await db.insert(compensationEarned).values({
    leadLineId: conversion.leadLineId,
    conversionId: conversion.id,
    creditedUserId: attribution.creditedUserId,
    campaignId: attribution.campaignId,
    campaignTrackingLinkId: attribution.campaignTrackingLinkId,
    eventId: attribution.eventId,
    offeringName: conversion.offeringName,
    monthlyCents: conversion.monthlyCents,
    basis: config.basis,
    basisBps: config.basisBps,
    amountCents,
    earnedAt: conversion.joinedAt,
    paymentStatus: 'UNPAID',
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return row!
}

export async function listCompensationLedger(db: Database) {
  return db.query.compensationEarned.findMany({
    with: {
      creditedUser: { columns: { id: true, displayName: true, role: true } },
      leadLine: {
        columns: { id: true, firstName: true, lastName: true, leadId: true },
      },
      conversion: {
        columns: { id: true, monthlyCents: true, offeringName: true, joinedAt: true },
      },
    },
    orderBy: [desc(compensationEarned.earnedAt)],
  })
}

export async function markCompensationPaid(
  db: Database,
  earnedId: number,
  actor: SessionUser,
  paidAt?: Date,
) {
  const [row] = await db.select().from(compensationEarned).where(eq(compensationEarned.id, earnedId)).limit(1)
  if (!row) {
    throw new DomainError('Compensation entry not found.', 404)
  }
  const stamp = now()
  await db.update(compensationEarned).set({
    paymentStatus: 'PAID',
    paidAt: paidAt ?? stamp,
    paidByUserId: actor.id,
    updatedAt: stamp,
  }).where(eq(compensationEarned.id, earnedId))
  const [updated] = await db.select().from(compensationEarned).where(eq(compensationEarned.id, earnedId)).limit(1)
  return updated!
}

export { compensationAmountCents }
