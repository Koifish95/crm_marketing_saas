import { asc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import {
  householdPricingRules,
  leadSources,
  lostReasons,
  membershipOfferings,
  programs,
} from '../database/schema'
import { utcNowMs } from '../../shared/utils/time'
import { DomainError } from './errors'

function now() {
  return new Date(utcNowMs())
}

export async function listLeadSources(db: Database, options?: { activeOnly?: boolean }) {
  const rows = await db.select().from(leadSources).orderBy(asc(leadSources.sortOrder), asc(leadSources.name))
  return options?.activeOnly ? rows.filter(row => row.active) : rows
}

export async function upsertLeadSource(
  db: Database,
  input: { id?: number, code: string, name: string, active?: boolean, sortOrder?: number },
) {
  const stamp = now()
  const code = input.code.trim().toUpperCase().replace(/\s+/g, '_')
  if (input.id) {
    const [existing] = await db.select().from(leadSources).where(eq(leadSources.id, input.id))
    if (!existing) {
      throw new DomainError('Lead source not found.', 404)
    }
    await db.update(leadSources).set({
      name: input.name.trim(),
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      updatedAt: stamp,
    }).where(eq(leadSources.id, input.id))
    const [row] = await db.select().from(leadSources).where(eq(leadSources.id, input.id))
    return row!
  }
  const [existing] = await db.select().from(leadSources).where(eq(leadSources.code, code))
  if (existing) {
    throw new DomainError('A source with that code already exists.')
  }
  const [row] = await db.insert(leadSources).values({
    code,
    name: input.name.trim(),
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return row!
}

export async function listLostReasons(db: Database, options?: { activeOnly?: boolean }) {
  const rows = await db.select().from(lostReasons).orderBy(asc(lostReasons.sortOrder), asc(lostReasons.name))
  return options?.activeOnly ? rows.filter(row => row.active) : rows
}

export async function upsertLostReason(
  db: Database,
  input: { id?: number, code: string, name: string, active?: boolean, sortOrder?: number },
) {
  const stamp = now()
  const code = input.code.trim().toUpperCase().replace(/\s+/g, '_')
  if (input.id) {
    const [existing] = await db.select().from(lostReasons).where(eq(lostReasons.id, input.id))
    if (!existing) {
      throw new DomainError('Lost reason not found.', 404)
    }
    await db.update(lostReasons).set({
      name: input.name.trim(),
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      updatedAt: stamp,
    }).where(eq(lostReasons.id, input.id))
    const [row] = await db.select().from(lostReasons).where(eq(lostReasons.id, input.id))
    return row!
  }
  const [existing] = await db.select().from(lostReasons).where(eq(lostReasons.code, code))
  if (existing) {
    throw new DomainError('A lost reason with that code already exists.')
  }
  const [row] = await db.insert(lostReasons).values({
    code,
    name: input.name.trim(),
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return row!
}

export async function listMembershipOfferings(db: Database, options?: { activeOnly?: boolean }) {
  const rows = await db.query.membershipOfferings.findMany({
    with: { program: true },
    orderBy: (table, { asc: orderAsc }) => [orderAsc(table.sortOrder), orderAsc(table.name)],
  })
  return options?.activeOnly ? rows.filter(row => row.active) : rows
}

export async function upsertMembershipOffering(
  db: Database,
  input: {
    id?: number
    name: string
    programId: number
    monthlyCents: number
    enrollmentCents?: number
    description?: string | null
    active?: boolean
    sortOrder?: number
  },
) {
  const [program] = await db.select().from(programs).where(eq(programs.id, input.programId))
  if (!program) {
    throw new DomainError('Program not found.', 404)
  }
  if (!Number.isInteger(input.monthlyCents) || input.monthlyCents < 0) {
    throw new DomainError('Monthly amount must be integer cents.')
  }
  const enrollmentCents = input.enrollmentCents ?? 0
  if (!Number.isInteger(enrollmentCents) || enrollmentCents < 0) {
    throw new DomainError('Enrollment amount must be integer cents.')
  }
  const stamp = now()
  if (input.id) {
    const [existing] = await db.select().from(membershipOfferings).where(eq(membershipOfferings.id, input.id))
    if (!existing) {
      throw new DomainError('Offering not found.', 404)
    }
    await db.update(membershipOfferings).set({
      name: input.name.trim(),
      programId: input.programId,
      monthlyCents: input.monthlyCents,
      enrollmentCents,
      description: input.description?.trim() || null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      updatedAt: stamp,
    }).where(eq(membershipOfferings.id, input.id))
    const [row] = await db.select().from(membershipOfferings).where(eq(membershipOfferings.id, input.id))
    return row!
  }
  const [row] = await db.insert(membershipOfferings).values({
    name: input.name.trim(),
    programId: input.programId,
    monthlyCents: input.monthlyCents,
    enrollmentCents,
    description: input.description?.trim() || null,
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return row!
}

export async function listHouseholdPricingRules(db: Database) {
  return db.query.householdPricingRules.findMany({
    with: { program: true },
    orderBy: (table, { asc: orderAsc }) => [orderAsc(table.programId)],
  })
}

export async function upsertHouseholdPricingRule(
  db: Database,
  input: { id?: number, programId: number, firstMonthlyCents: number, additionalMonthlyCents: number, active?: boolean },
) {
  const [program] = await db.select().from(programs).where(eq(programs.id, input.programId))
  if (!program) {
    throw new DomainError('Program not found.', 404)
  }
  if (!Number.isInteger(input.firstMonthlyCents) || input.firstMonthlyCents < 0
    || !Number.isInteger(input.additionalMonthlyCents) || input.additionalMonthlyCents < 0) {
    throw new DomainError('Household prices must be integer cents.')
  }
  const stamp = now()
  if (input.id) {
    const [existing] = await db.select().from(householdPricingRules).where(eq(householdPricingRules.id, input.id))
    if (!existing) {
      throw new DomainError('Household pricing rule not found.', 404)
    }
    await db.update(householdPricingRules).set({
      firstMonthlyCents: input.firstMonthlyCents,
      additionalMonthlyCents: input.additionalMonthlyCents,
      active: input.active ?? true,
      updatedAt: stamp,
    }).where(eq(householdPricingRules.id, input.id))
    const [row] = await db.select().from(householdPricingRules).where(eq(householdPricingRules.id, input.id))
    return row!
  }
  const [conflict] = await db.select().from(householdPricingRules).where(eq(householdPricingRules.programId, input.programId))
  if (conflict) {
    throw new DomainError('That program already has a household pricing rule.')
  }
  const [row] = await db.insert(householdPricingRules).values({
    programId: input.programId,
    firstMonthlyCents: input.firstMonthlyCents,
    additionalMonthlyCents: input.additionalMonthlyCents,
    active: input.active ?? true,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return row!
}

export async function createProgram(
  db: Database,
  input: { code: string, name: string, active?: boolean, seasonal?: boolean },
) {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, '_')
  if (!code) {
    throw new DomainError('Program code is required.')
  }
  const [existing] = await db.select().from(programs).where(eq(programs.code, code))
  if (existing) {
    throw new DomainError('A program with that code already exists.')
  }
  const stamp = now()
  const [row] = await db.insert(programs).values({
    code,
    name: input.name.trim(),
    active: input.active ?? true,
    seasonal: input.seasonal ?? false,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return row!
}

export async function updateProgram(
  db: Database,
  id: number,
  input: { name?: string, active?: boolean, seasonal?: boolean },
) {
  const [program] = await db.select().from(programs).where(eq(programs.id, id))
  if (!program) {
    throw new DomainError('Program not found.', 404)
  }
  await db.update(programs).set({
    name: input.name?.trim() || program.name,
    active: input.active ?? program.active,
    seasonal: input.seasonal ?? program.seasonal,
    updatedAt: now(),
  }).where(eq(programs.id, id))
  const [row] = await db.select().from(programs).where(eq(programs.id, id))
  return row!
}
