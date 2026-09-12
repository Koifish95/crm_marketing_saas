import { and, desc, eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import {
  salesOffers,
  salesOpportunities,
  salesOpportunityLines,
} from '../database/schema'
import { isOfferPricingType, lineMrrCents, lineOneTimeCents, type OfferPricingType } from '../../shared/utils/catalog'
import { utcNowMs } from '../../shared/utils/time'

function now() {
  return new Date(utcNowMs())
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function listOffers(db: Database, filters: { active?: boolean, search?: string } = {}) {
  const rows = await db.select().from(salesOffers).orderBy(salesOffers.name)
  return rows.filter((row) => {
    if (filters.active != null && row.active !== filters.active) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!row.name.toLowerCase().includes(q) && !(row.description ?? '').toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })
}

export async function getOffer(db: Database, id: number) {
  const [row] = await db.select().from(salesOffers).where(eq(salesOffers.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Offer not found.', 404)
  }
  return row
}

export async function createOffer(db: Database, input: {
  name: string
  description?: string
  pricingType: OfferPricingType
  defaultUnitPriceCents: number
  active?: boolean
}) {
  const name = input.name.trim()
  if (!name) {
    throw new DomainError('Offer name is required.')
  }
  if (!isOfferPricingType(input.pricingType)) {
    throw new DomainError('Unknown pricing type.')
  }
  if (!Number.isInteger(input.defaultUnitPriceCents) || input.defaultUnitPriceCents < 0) {
    throw new DomainError('Default price must be a non-negative integer number of cents.')
  }
  const createdAt = now()
  await db.insert(salesOffers).values({
    name,
    description: blankToNull(input.description),
    pricingType: input.pricingType,
    defaultUnitPriceCents: input.defaultUnitPriceCents,
    active: input.active ?? true,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesOffers)
    .where(and(eq(salesOffers.name, name), eq(salesOffers.createdAt, createdAt)))
    .orderBy(desc(salesOffers.id))
    .limit(1)
  return created!
}

export async function updateOffer(db: Database, id: number, input: {
  name?: string
  description?: string | null
  pricingType?: OfferPricingType
  defaultUnitPriceCents?: number
  active?: boolean
}) {
  await getOffer(db, id)
  const patch: Partial<typeof salesOffers.$inferInsert> = { updatedAt: now() }
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      throw new DomainError('Offer name is required.')
    }
    patch.name = name
  }
  if (input.description !== undefined) {
    patch.description = blankToNull(input.description)
  }
  if (input.pricingType !== undefined) {
    if (!isOfferPricingType(input.pricingType)) {
      throw new DomainError('Unknown pricing type.')
    }
    patch.pricingType = input.pricingType
  }
  if (input.defaultUnitPriceCents !== undefined) {
    if (!Number.isInteger(input.defaultUnitPriceCents) || input.defaultUnitPriceCents < 0) {
      throw new DomainError('Default price must be a non-negative integer number of cents.')
    }
    patch.defaultUnitPriceCents = input.defaultUnitPriceCents
  }
  if (input.active !== undefined) {
    patch.active = input.active
  }
  await db.update(salesOffers).set(patch).where(eq(salesOffers.id, id))
  return getOffer(db, id)
}

export function decorateLine(line: typeof salesOpportunityLines.$inferSelect) {
  return {
    ...line,
    oneTimeCents: lineOneTimeCents(line.pricingType, line.quantity, line.unitPriceCents),
    mrrCents: lineMrrCents(line.pricingType, line.quantity, line.unitPriceCents),
  }
}

export async function listOpportunityLines(db: Database, opportunityId: number) {
  const rows = await db.select().from(salesOpportunityLines)
    .where(eq(salesOpportunityLines.opportunityId, opportunityId))
    .orderBy(salesOpportunityLines.id)
  return rows.map(decorateLine)
}

export async function getOpportunityLine(db: Database, id: number) {
  const [row] = await db.select().from(salesOpportunityLines).where(eq(salesOpportunityLines.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Commercial line not found.', 404)
  }
  return decorateLine(row)
}

export async function recalculateOpportunityTotals(db: Database, opportunityId: number) {
  const lines = await listOpportunityLines(db, opportunityId)
  const amountCents = lines.reduce((sum, line) => sum + line.oneTimeCents, 0)
  const mrrCents = lines.reduce((sum, line) => sum + line.mrrCents, 0)
  await db.update(salesOpportunities).set({
    amountCents,
    mrrCents,
    updatedAt: now(),
  }).where(eq(salesOpportunities.id, opportunityId))
  return { amountCents, mrrCents }
}

async function requireOpportunity(db: Database, opportunityId: number) {
  const [row] = await db.select().from(salesOpportunities).where(eq(salesOpportunities.id, opportunityId)).limit(1)
  if (!row) {
    throw new DomainError('Opportunity not found.', 404)
  }
  return row
}

export async function addOpportunityLine(db: Database, input: {
  opportunityId: number
  offerId?: number | null
  description?: string
  quantity?: number
  pricingType?: OfferPricingType
  unitPriceCents?: number
}) {
  await requireOpportunity(db, input.opportunityId)
  let offer = null
  if (input.offerId) {
    offer = await getOffer(db, input.offerId)
  }
  const pricingType = input.pricingType ?? offer?.pricingType
  if (!pricingType || !isOfferPricingType(pricingType)) {
    throw new DomainError('Choose a one-time or monthly pricing type.')
  }
  const quantity = input.quantity ?? 1
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new DomainError('Quantity must be a positive integer.')
  }
  const unitPriceCents = input.unitPriceCents ?? offer?.defaultUnitPriceCents ?? 0
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new DomainError('Unit price must be a non-negative integer number of cents.')
  }
  const description = (input.description ?? offer?.name ?? '').trim()
  if (!description) {
    throw new DomainError('Line description is required.')
  }
  const createdAt = now()
  await db.insert(salesOpportunityLines).values({
    opportunityId: input.opportunityId,
    offerId: offer?.id ?? null,
    description,
    quantity,
    pricingType,
    unitPriceCents,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesOpportunityLines)
    .where(and(eq(salesOpportunityLines.opportunityId, input.opportunityId), eq(salesOpportunityLines.createdAt, createdAt)))
    .orderBy(desc(salesOpportunityLines.id))
    .limit(1)
  await recalculateOpportunityTotals(db, input.opportunityId)
  return decorateLine(created!)
}

export async function updateOpportunityLine(db: Database, id: number, input: {
  description?: string
  quantity?: number
  pricingType?: OfferPricingType
  unitPriceCents?: number
}) {
  const current = await getOpportunityLine(db, id)
  const patch: Partial<typeof salesOpportunityLines.$inferInsert> = { updatedAt: now() }
  if (input.description !== undefined) {
    const description = input.description.trim()
    if (!description) {
      throw new DomainError('Line description is required.')
    }
    patch.description = description
  }
  if (input.quantity !== undefined) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new DomainError('Quantity must be a positive integer.')
    }
    patch.quantity = input.quantity
  }
  if (input.pricingType !== undefined) {
    if (!isOfferPricingType(input.pricingType)) {
      throw new DomainError('Unknown pricing type.')
    }
    patch.pricingType = input.pricingType
  }
  if (input.unitPriceCents !== undefined) {
    if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
      throw new DomainError('Unit price must be a non-negative integer number of cents.')
    }
    patch.unitPriceCents = input.unitPriceCents
  }
  await db.update(salesOpportunityLines).set(patch).where(eq(salesOpportunityLines.id, id))
  await recalculateOpportunityTotals(db, current.opportunityId)
  return getOpportunityLine(db, id)
}

export async function deleteOpportunityLine(db: Database, id: number) {
  const current = await getOpportunityLine(db, id)
  await db.delete(salesOpportunityLines).where(eq(salesOpportunityLines.id, id))
  await recalculateOpportunityTotals(db, current.opportunityId)
  return current
}
