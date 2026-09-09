import { and, eq } from 'drizzle-orm'
import type { Database } from '../database'
import {
  introAvailabilityRules,
  introExceptions,
  programs,
} from '../database/schema'
import { DomainError } from './errors'
import { BOOKING_HORIZON_DAYS, slotMatchesAge, type IntroExceptionKind } from '../../shared/utils/intro'
import {
  denverParts,
  denverWallToUtc,
  denverYmd,
  listCalendarDates,
  utcNowMs,
  weekdayFromYmd,
} from '../../shared/utils/time'

export interface BookableSlot {
  id: string
  date: string
  weekday: number
  startMinute: number
  endMinute: number | null
  name: string
  programId: number
  programCode: string
  scheduledAt: string
  ruleId: number | null
  exceptionId: number | null
  ageMin: number | null
  ageMax: number | null
}

export interface CreateRuleInput {
  programId: number
  weekday: number
  startMinute: number
  endMinute?: number | null
  name: string
  ageMin?: number | null
  ageMax?: number | null
  enabled?: boolean
  seedKey?: string
}

export interface CreateExceptionInput {
  onDate: string
  kind: IntroExceptionKind
  ruleId?: number | null
  programId?: number | null
  name?: string | null
  startMinute?: number | null
  endMinute?: number | null
  ageMin?: number | null
  ageMax?: number | null
  note?: string | null
}

function ruleSlotId(ruleId: number, date: string) {
  return `rule:${ruleId}:${date}`
}

function exceptionSlotId(exceptionId: number) {
  return `exception:${exceptionId}`
}

export function parseSlotId(slotId: string): { type: 'rule', ruleId: number, date: string } | { type: 'exception', exceptionId: number } {
  const ruleMatch = /^rule:(\d+):(\d{4}-\d{2}-\d{2})$/.exec(slotId)
  if (ruleMatch) {
    return { type: 'rule', ruleId: Number(ruleMatch[1]), date: ruleMatch[2]! }
  }
  const exceptionMatch = /^exception:(\d+)$/.exec(slotId)
  if (exceptionMatch) {
    return { type: 'exception', exceptionId: Number(exceptionMatch[1]) }
  }
  throw new DomainError('That intro time is not available.')
}

export async function listIntroRules(db: Database) {
  return db.query.introAvailabilityRules.findMany({
    with: { program: true },
    orderBy: (table, { asc }) => [asc(table.weekday), asc(table.startMinute), asc(table.name)],
  })
}

export async function hasPublishedIntroAvailability(db: Database) {
  const [row] = await db.select({ id: introAvailabilityRules.id })
    .from(introAvailabilityRules)
    .where(eq(introAvailabilityRules.enabled, true))
    .limit(1)
  return Boolean(row)
}

export async function createIntroRule(db: Database, input: CreateRuleInput) {
  const [program] = await db.select().from(programs).where(eq(programs.id, input.programId)).limit(1)
  if (!program) {
    throw new DomainError('Program not found.', 404)
  }
  const now = new Date(utcNowMs())
  const seedKey = input.seedKey?.trim() || `custom-${utcNowMs()}`
  const [row] = await db.insert(introAvailabilityRules).values({
    seedKey,
    programId: input.programId,
    weekday: input.weekday,
    startMinute: input.startMinute,
    endMinute: input.endMinute ?? null,
    name: input.name.trim(),
    ageMin: input.ageMin ?? null,
    ageMax: input.ageMax ?? null,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  }).returning()
  return row!
}

export async function updateIntroRule(db: Database, id: number, input: Partial<CreateRuleInput>) {
  const existing = await db.query.introAvailabilityRules.findFirst({ where: eq(introAvailabilityRules.id, id) })
  if (!existing) {
    throw new DomainError('Availability rule not found.', 404)
  }
  const now = new Date(utcNowMs())
  const [row] = await db.update(introAvailabilityRules).set({
    programId: input.programId ?? existing.programId,
    weekday: input.weekday ?? existing.weekday,
    startMinute: input.startMinute ?? existing.startMinute,
    endMinute: input.endMinute !== undefined ? input.endMinute : existing.endMinute,
    name: input.name?.trim() ?? existing.name,
    ageMin: input.ageMin !== undefined ? input.ageMin : existing.ageMin,
    ageMax: input.ageMax !== undefined ? input.ageMax : existing.ageMax,
    enabled: input.enabled ?? existing.enabled,
    updatedAt: now,
  }).where(eq(introAvailabilityRules.id, id)).returning()
  return row!
}

export async function listIntroExceptions(db: Database) {
  return db.query.introExceptions.findMany({
    with: { rule: true, program: true },
    orderBy: (table, { desc }) => [desc(table.onDate), desc(table.id)],
  })
}

export async function createIntroException(db: Database, input: CreateExceptionInput) {
  if (input.kind === 'CLOSE_RULE' && !input.ruleId) {
    throw new DomainError('A class is required to close one slot.')
  }
  if (input.kind === 'OPEN_SLOT' && (!input.programId || input.startMinute == null || !input.name?.trim())) {
    throw new DomainError('An extra class needs a program, name, and start time.')
  }
  const now = new Date(utcNowMs())
  const [row] = await db.insert(introExceptions).values({
    onDate: input.onDate,
    kind: input.kind,
    ruleId: input.ruleId ?? null,
    programId: input.programId ?? null,
    name: input.name?.trim() || null,
    startMinute: input.startMinute ?? null,
    endMinute: input.endMinute ?? null,
    ageMin: input.ageMin ?? null,
    ageMax: input.ageMax ?? null,
    note: input.note?.trim() || null,
    createdAt: now,
    updatedAt: now,
  }).returning()
  return row!
}

export async function deleteIntroException(db: Database, id: number) {
  const existing = await db.query.introExceptions.findFirst({ where: eq(introExceptions.id, id) })
  if (!existing) {
    throw new DomainError('Exception not found.', 404)
  }
  await db.delete(introExceptions).where(eq(introExceptions.id, id))
  return { ok: true }
}

export async function listPublicSlots(
  db: Database,
  input: { programCode: 'ADULT_BJJ' | 'KIDS_BJJ', age?: number, nowMs?: number, horizonDays?: number },
): Promise<BookableSlot[]> {
  if (input.programCode === 'KIDS_BJJ' && input.age == null) {
    return []
  }

  const nowMs = input.nowMs ?? utcNowMs()
  const horizonDays = input.horizonDays ?? BOOKING_HORIZON_DAYS
  const today = denverYmd(nowMs)
  const dates = listCalendarDates(today, horizonDays)
  const lastDate = dates[dates.length - 1]!

  const [program] = await db.select().from(programs).where(eq(programs.code, input.programCode)).limit(1)
  if (!program || !program.active) {
    return []
  }

  const rules = await db.query.introAvailabilityRules.findMany({
    where: and(eq(introAvailabilityRules.programId, program.id), eq(introAvailabilityRules.enabled, true)),
    with: { program: true },
  })
  const exceptions = await db.query.introExceptions.findMany({
    where: (table, { gte, lte, and: andFn }) => andFn(gte(table.onDate, today), lte(table.onDate, lastDate)),
  })

  const closedDates = new Set(exceptions.filter(item => item.kind === 'CLOSE_DATE').map(item => item.onDate))
  const closedRules = new Set(
    exceptions
      .filter(item => item.kind === 'CLOSE_RULE' && item.ruleId != null)
      .map(item => `${item.onDate}:${item.ruleId}`),
  )

  const nowParts = denverParts(nowMs)
  const slots: BookableSlot[] = []

  for (const date of dates) {
    const weekday = weekdayFromYmd(date)
    if (!closedDates.has(date)) {
      for (const rule of rules) {
        if (rule.weekday !== weekday) {
          continue
        }
        if (closedRules.has(`${date}:${rule.id}`)) {
          continue
        }
        if (!slotMatchesAge(input.age, rule.ageMin, rule.ageMax)) {
          continue
        }
        const scheduled = denverWallToUtc(date, rule.startMinute)
        if (scheduled.getTime() <= nowMs) {
          continue
        }
        if (date === today && rule.startMinute <= nowParts.minuteOfDay) {
          continue
        }
        slots.push({
          id: ruleSlotId(rule.id, date),
          date,
          weekday,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
          name: rule.name,
          programId: program.id,
          programCode: program.code,
          scheduledAt: scheduled.toISOString(),
          ruleId: rule.id,
          exceptionId: null,
          ageMin: rule.ageMin,
          ageMax: rule.ageMax,
        })
      }
    }

    for (const extra of exceptions.filter(item => item.kind === 'OPEN_SLOT' && item.onDate === date)) {
      if (extra.programId !== program.id || extra.startMinute == null || !extra.name) {
        continue
      }
      if (!slotMatchesAge(input.age, extra.ageMin, extra.ageMax)) {
        continue
      }
      const scheduled = denverWallToUtc(date, extra.startMinute)
      if (scheduled.getTime() <= nowMs) {
        continue
      }
      slots.push({
        id: exceptionSlotId(extra.id),
        date,
        weekday,
        startMinute: extra.startMinute,
        endMinute: extra.endMinute,
        name: extra.name,
        programId: program.id,
        programCode: program.code,
        scheduledAt: scheduled.toISOString(),
        ruleId: extra.ruleId,
        exceptionId: extra.id,
        ageMin: extra.ageMin,
        ageMax: extra.ageMax,
      })
    }
  }

  return slots.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.name.localeCompare(b.name))
}

export async function getBookableSlot(
  db: Database,
  slotId: string,
  options: { nowMs?: number, age?: number } = {},
): Promise<BookableSlot> {
  const nowMs = options.nowMs ?? utcNowMs()
  const parsed = parseSlotId(slotId)
  if (parsed.type === 'rule') {
    const rule = await db.query.introAvailabilityRules.findFirst({
      where: eq(introAvailabilityRules.id, parsed.ruleId),
      with: { program: true },
    })
    if (!rule || !rule.enabled || !rule.program?.active) {
      throw new DomainError('That intro time is not available.')
    }
    const programCode = rule.program.code
    if (programCode !== 'ADULT_BJJ' && programCode !== 'KIDS_BJJ') {
      throw new DomainError('That intro time is not available.')
    }
    const slots = await listPublicSlots(db, {
      programCode,
      age: options.age,
      nowMs,
    })
    const match = slots.find(slot => slot.id === slotId)
    if (!match) {
      throw new DomainError('That intro time is not available.')
    }
    return match
  }

  const extra = await db.query.introExceptions.findFirst({
    where: eq(introExceptions.id, parsed.exceptionId),
    with: { program: true },
  })
  if (!extra || extra.kind !== 'OPEN_SLOT' || !extra.program) {
    throw new DomainError('That intro time is not available.')
  }
  const programCode = extra.program.code
  if (programCode !== 'ADULT_BJJ' && programCode !== 'KIDS_BJJ') {
    throw new DomainError('That intro time is not available.')
  }
  const slots = await listPublicSlots(db, {
    programCode,
    age: options.age,
    nowMs,
  })
  const match = slots.find(slot => slot.id === slotId)
  if (!match) {
    throw new DomainError('That intro time is not available.')
  }
  return match
}
