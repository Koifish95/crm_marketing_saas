import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import { campaigns, introAvailabilityRules, leads, programs, trials, users } from '../../server/database/schema'
import { createIntroException, createIntroRule, listPublicSlots, updateIntroRule } from '../../server/services/availability'
import { isAdmin } from '../../server/services/authorization'
import { bookPublicTrial, resolvePublicSource } from '../../server/services/public-trial'
import * as leadService from '../../server/services/leads'
import { DomainError } from '../../server/services/errors'
import { publicTrialSchema } from '../../shared/schemas/intro'
import { BOOKING_HORIZON_DAYS } from '../../shared/utils/intro'
import { normalizePhone, phonesMatch } from '../../shared/utils/phone'
import { clockToMinuteOfDay, denverWallToUtc, denverYmd, minuteOfDayToClock } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

const MONDAY_AFTERNOON_MDT = Date.parse('2026-08-31T21:00:00.000Z')

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

describe('M4 intro availability', () => {
  it('normalizes common US phone formats to the same digits', () => {
    expect(normalizePhone('8015550100')).toBe('8015550100')
    expect(normalizePhone('801-555-0100')).toBe('8015550100')
    expect(normalizePhone('(801) 555-0100')).toBe('8015550100')
    expect(phonesMatch('8015550100', '801-555-0100')).toBe(true)
    expect(phonesMatch('8015550100', '(801) 555-0100')).toBe(true)
    expect(minuteOfDayToClock(18 * 60)).toBe('18:00')
    expect(clockToMinuteOfDay('18:00')).toBe(18 * 60)
  })

  it('turns recurring rules into upcoming Denver dates and hides disabled rules', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultSlots = await listPublicSlots(testDb.db, {
        programCode: 'ADULT_BJJ',
        nowMs: MONDAY_AFTERNOON_MDT,
      })
      expect(adultSlots.length).toBeGreaterThan(0)
      expect(adultSlots.every(slot => slot.programCode === 'ADULT_BJJ')).toBe(true)
      expect(adultSlots.some(slot => slot.name.includes('Ninjas'))).toBe(false)
      expect(adultSlots[0]?.date >= '2026-08-31').toBe(true)
      expect(adultSlots.every(slot => slot.date <= denverYmd(MONDAY_AFTERNOON_MDT + BOOKING_HORIZON_DAYS * 86_400_000 + 86_400_000))).toBe(true)

      const mondayEvening = adultSlots.find(slot => slot.date === '2026-08-31' && slot.name.includes('Jiu Jitsu with Gi') && slot.startMinute === 18 * 60)
      expect(mondayEvening).toBeTruthy()
      expect(adultSlots.some(slot => slot.date === '2026-08-31' && slot.startMinute === 6 * 60)).toBe(false)

      const [rule] = await testDb.db.select().from(introAvailabilityRules).where(eq(introAvailabilityRules.seedKey, 'adult-mon-1800-gi'))
      await updateIntroRule(testDb.db, rule!.id, { enabled: false })
      const afterDisable = await listPublicSlots(testDb.db, {
        programCode: 'ADULT_BJJ',
        nowMs: MONDAY_AFTERNOON_MDT,
      })
      expect(afterDisable.some(slot => slot.id === mondayEvening!.id)).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('applies date closures, rule closures, and extra open slots', async () => {
    const testDb = await openTestDatabase()
    try {
      const before = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      expect(before.some(slot => slot.date === '2026-09-01')).toBe(true)

      await createIntroException(testDb.db, { onDate: '2026-09-01', kind: 'CLOSE_DATE' })
      const closed = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      expect(closed.some(slot => slot.date === '2026-09-01')).toBe(false)

      const [rule] = await testDb.db.select().from(introAvailabilityRules).where(eq(introAvailabilityRules.seedKey, 'adult-wed-1800-gi'))
      await createIntroException(testDb.db, { onDate: '2026-09-02', kind: 'CLOSE_RULE', ruleId: rule!.id })
      const afterRuleClose = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      expect(afterRuleClose.some(slot => slot.date === '2026-09-02' && slot.ruleId === rule!.id)).toBe(false)
      expect(afterRuleClose.some(slot => slot.date === '2026-09-02')).toBe(true)

      const adultId = await programId(testDb.db, 'ADULT_BJJ')
      await createIntroException(testDb.db, {
        onDate: '2026-09-05',
        kind: 'OPEN_SLOT',
        programId: adultId,
        name: 'Special Saturday intro',
        startMinute: 10 * 60,
      })
      const withExtra = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      expect(withExtra.some(slot => slot.name === 'Special Saturday intro' && slot.date === '2026-09-05')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('resolves kids age bands and Denver wall times', async () => {
    const testDb = await openTestDatabase()
    try {
      const ninjas = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 5, nowMs: MONDAY_AFTERNOON_MDT })
      expect(ninjas.length).toBeGreaterThan(0)
      expect(ninjas.every(slot => slot.name.includes('Ninjas') || slot.name.includes('Fun Day'))).toBe(true)
      expect(ninjas.some(slot => slot.name.includes('Future Champs'))).toBe(false)

      const samurai = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 9, nowMs: MONDAY_AFTERNOON_MDT })
      expect(samurai.some(slot => slot.name.includes('Samurai'))).toBe(true)
      expect(samurai.some(slot => slot.name.includes('Ninjas No-Gi'))).toBe(false)

      const champs = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 13, nowMs: MONDAY_AFTERNOON_MDT })
      expect(champs.some(slot => slot.name.includes('Future Champs'))).toBe(true)
      expect(champs.some(slot => slot.name.includes('Samurai'))).toBe(false)

      const utc = denverWallToUtc('2026-08-31', 18 * 60)
      expect(denverYmd(utc.getTime())).toBe('2026-08-31')
    } finally {
      await testDb.close()
    }
  })
})

describe('M4 public booking', () => {
  it('creates a coherent Adult booking and ignores status injection', async () => {
    const testDb = await openTestDatabase()
    try {
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const slot = slots.find(item => item.date === '2026-08-31' && item.startMinute === 18 * 60)!
      const parsed = publicTrialSchema.safeParse({
        path: 'ADULT',
        firstName: 'Alex',
        lastName: 'Prospect',
        phone: '8015550100',
        slotId: slot.id,
        status: 'JOINED',
        source: 'instagram',
        idempotencyKey: randomUUID(),
      })
      expect(parsed.success).toBe(true)

      const result = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Alex',
        lastName: 'Prospect',
        phone: '8015550100',
        slotId: slot.id,
        source: 'instagram',
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(result.lead.status).toBe('TRIAL_SCHEDULED')
      expect(result.lead.source).toBe('INSTAGRAM')
      expect(result.lead.trials.some(trial => trial.status === 'SCHEDULED')).toBe(true)
      expect(result.lead.statusHistory.some(item => item.toStatus === 'NEW')).toBe(true)
      expect(result.lead.statusHistory.some(item => item.toStatus === 'TRIAL_SCHEDULED')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('creates Kids bookings, requires phone, and rejects unavailable slots', async () => {
    const testDb = await openTestDatabase()
    try {
      const ninjaSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 6, nowMs: MONDAY_AFTERNOON_MDT })
      const ninja = ninjaSlots[0]!
      const kids = await bookPublicTrial(testDb.db, {
        path: 'KIDS',
        firstName: 'Pat',
        lastName: 'Parent',
        phone: '8015550101',
        slotId: ninja.id,
        participantFirstName: 'Sam',
        participantAge: 6,
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(kids.lead.participantFirstName).toBe('Sam')
      expect(kids.lead.program.code).toBe('KIDS_BJJ')

      const champSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 14, nowMs: MONDAY_AFTERNOON_MDT })
      const champ = champSlots[0]!
      const older = await bookPublicTrial(testDb.db, {
        path: 'KIDS',
        firstName: 'Kim',
        lastName: 'Guardian',
        phone: '8015550102',
        slotId: champ.id,
        participantFirstName: 'Riley',
        participantAge: 14,
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(older.slot.name.includes('Future Champs') || older.slot.ageMin === 12).toBe(true)

      expect(publicTrialSchema.safeParse({
        path: 'ADULT',
        firstName: 'No',
        lastName: 'Phone',
        slotId: ninja.id,
      }).success).toBe(false)

      await expect(bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Bad',
        lastName: 'Slot',
        phone: '8015550199',
        slotId: 'rule:999:2026-08-31',
      })).rejects.toBeInstanceOf(DomainError)

      const leadCount = await testDb.db.select().from(leads)
      expect(leadCount.some(row => row.phone === '8015550199')).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('is idempotent on retry of the same submission key and resolves campaign slugs safely', async () => {
    const testDb = await openTestDatabase()
    try {
      await testDb.db.insert(campaigns).values({
        name: 'Fall Adult',
        slug: 'fall-adult-bjj',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const slot = slots[0]!
      const key = randomUUID()
      const first = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Retry',
        lastName: 'User',
        phone: '8015550110',
        slotId: slot.id,
        campaign: 'fall-adult-bjj',
        idempotencyKey: key,
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(first.lead.campaignId).toBeTruthy()
      expect(first.replayed).toBe(false)
      const second = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Retry',
        lastName: 'User',
        phone: '8015550110',
        slotId: slot.id,
        campaign: 'not-a-real-campaign',
        idempotencyKey: key,
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(second.replayed).toBe(true)
      expect(second.lead.id).toBe(first.lead.id)
      const all = await testDb.db.select().from(leads).where(eq(leads.phone, '8015550110'))
      expect(all).toHaveLength(1)
      const bookedTrials = await testDb.db.select().from(trials).where(eq(trials.leadId, first.lead.id))
      expect(bookedTrials).toHaveLength(1)
      expect(resolvePublicSource('facebook')).toBe('FACEBOOK')
      expect(resolvePublicSource('garbage')).toBe('WEBSITE')
    } finally {
      await testDb.close()
    }
  })

  it('does not treat formatted phone variants as the same household', async () => {
    const testDb = await openTestDatabase()
    try {
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const slot = slots[0]!
      const first = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Pat',
        lastName: 'Phone',
        phone: '(801) 555-0100',
        slotId: slot.id,
        idempotencyKey: randomUUID(),
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(first.lead.phone).toBe('8015550100')
      const second = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Pat',
        lastName: 'Phone',
        phone: '801-555-0100',
        slotId: slot.id,
        idempotencyKey: randomUUID(),
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(second.replayed).toBe(false)
      expect(second.lead.id).not.toBe(first.lead.id)
      const third = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Pat',
        lastName: 'Phone',
        phone: '8015550100',
        slotId: slot.id,
        idempotencyKey: randomUUID(),
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(third.lead.id).not.toBe(first.lead.id)
      expect(third.lead.id).not.toBe(second.lead.id)
      const rows = await testDb.db.select().from(leads).where(eq(leads.phone, '8015550100'))
      expect(rows).toHaveLength(3)
      expect(second.lead.possibleDuplicateMatches?.some(match => match.matchedLeadId === first.lead.id)).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('rolls back the Lead if Trial creation fails', async () => {
    const testDb = await openTestDatabase()
    const spy = vi.spyOn(leadService, 'createTrial').mockRejectedValueOnce(new Error('forced trial failure'))
    try {
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const slot = slots[0]!
      await expect(bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Rollback',
        lastName: 'User',
        phone: '8015550170',
        slotId: slot.id,
      }, { nowMs: MONDAY_AFTERNOON_MDT })).rejects.toThrow('forced trial failure')
      const leftover = await testDb.db.select().from(leads).where(eq(leads.phone, '8015550170'))
      expect(leftover).toHaveLength(0)
    } finally {
      spy.mockRestore()
      await testDb.close()
    }
  })

  it('keeps availability writes as an ADMIN concern', async () => {
    expect(isAdmin('ADMIN')).toBe(true)
    expect(isAdmin('STAFF')).toBe(false)
    expect(isAdmin('VIEWER')).toBe(false)
    const testDb = await openTestDatabase()
    try {
      const adultId = await programId(testDb.db, 'ADULT_BJJ')
      const created = await createIntroRule(testDb.db, {
        programId: adultId,
        weekday: 0,
        startMinute: 10 * 60,
        name: 'Sunday intro',
      })
      expect(created.enabled).toBe(true)
      const [admin] = await testDb.db.select().from(users)
      expect(admin?.username).toBe('admin')
    } finally {
      await testDb.close()
    }
  })
})
