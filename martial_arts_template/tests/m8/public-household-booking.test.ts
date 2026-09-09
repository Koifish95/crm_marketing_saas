import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import { followUpTasks, leadLines, leads, programs, publicBookingSubmissions, trials } from '../../server/database/schema'
import { DomainError } from '../../server/services/errors'
import * as leadService from '../../server/services/leads'
import { listPublicSlots } from '../../server/services/availability'
import { bookPublicHousehold, bookPublicTrial } from '../../server/services/public-trial'
import { publicHouseholdTrialSchema } from '../../shared/schemas/intro'
import { openTestDatabase } from '../helpers/db'

const MONDAY_AFTERNOON_MDT = Date.parse('2026-08-31T21:00:00.000Z')

async function adultSlot(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], startMinute = 18 * 60) {
  const slots = await listPublicSlots(db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
  return slots.find(slot => slot.date === '2026-08-31' && slot.startMinute === startMinute) ?? slots[0]!
}

async function kidsSlot(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], age: number) {
  const slots = await listPublicSlots(db, { programCode: 'KIDS_BJJ', age, nowMs: MONDAY_AFTERNOON_MDT })
  return slots[0]!
}

describe('M8 public household booking', () => {
  it('books one adult as a SELF line with follow-up and header attribution', async () => {
    const testDb = await openTestDatabase()
    try {
      const slot = await adultSlot(testDb.db)
      const result = await bookPublicHousehold(testDb.db, {
        firstName: 'Alex',
        lastName: 'Adult',
        phone: '8015556100',
        source: 'instagram',
        utmSource: 'ig',
        utmMedium: 'paid',
        members: [{
          relationship: 'SELF',
          firstName: 'Alex',
          lastName: 'Adult',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }],
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(result.lead.lines).toHaveLength(1)
      expect(result.lead.lines[0]?.relationship).toBe('SELF')
      expect(result.lead.lines[0]?.firstName).toBe('Alex')
      expect(result.lead.utmSource).toBe('ig')
      expect(result.lead.lines[0]?.trials).toHaveLength(1)
      const tasks = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.leadId, result.lead.id))
      expect(tasks.some(task => task.status === 'PENDING')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('books a child without creating a guardian LeadLine', async () => {
    const testDb = await openTestDatabase()
    try {
      const slot = await kidsSlot(testDb.db, 6)
      const result = await bookPublicHousehold(testDb.db, {
        firstName: 'Pat',
        lastName: 'Parent',
        phone: '8015556101',
        guardianRelationship: 'parent',
        members: [{
          relationship: 'CHILD',
          firstName: 'Sam',
          lastName: 'Kid',
          age: 6,
          programCode: 'KIDS_BJJ',
          slotId: slot.id,
        }],
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(result.lead.firstName).toBe('Pat')
      expect(result.lead.lines).toHaveLength(1)
      expect(result.lead.lines[0]?.relationship).toBe('CHILD')
      expect(result.lead.lines[0]?.firstName).toBe('Sam')
      expect(result.lead.lines.some(line => line.firstName === 'Pat')).toBe(false)
      expect(result.bookings[0]?.timeSlot.id).toBe(slot.id)
    } finally {
      await testDb.close()
    }
  })

  it('lets the primary contact participate as SELF without a duplicate line', async () => {
    const testDb = await openTestDatabase()
    try {
      const slot = await adultSlot(testDb.db)
      const parsed = publicHouseholdTrialSchema.safeParse({
        firstName: 'Jordan',
        lastName: 'Smith',
        phone: '8015556102',
        idempotencyKey: crypto.randomUUID(),
        members: [{
          relationship: 'SELF',
          firstName: 'Jordan',
          lastName: 'Smith',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }, {
          relationship: 'SELF',
          firstName: 'Jordan',
          lastName: 'Smith',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }],
      })
      expect(parsed.success).toBe(false)

      const result = await bookPublicHousehold(testDb.db, {
        firstName: 'Jordan',
        lastName: 'Smith',
        phone: '8015556102',
        members: [{
          relationship: 'SELF',
          firstName: 'Jordan',
          lastName: 'Smith',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }],
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(result.lead.lines.filter(line => line.relationship === 'SELF')).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('books the contact and a child together with independent programs and trials', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await adultSlot(testDb.db)
      const childSlot = await kidsSlot(testDb.db, 8)
      const result = await bookPublicHousehold(testDb.db, {
        firstName: 'Matt',
        lastName: 'Smith',
        phone: '8015556103',
        trackingCode: undefined,
        utmSource: 'meta',
        members: [{
          relationship: 'SELF',
          firstName: 'Matt',
          lastName: 'Smith',
          programCode: 'ADULT_BJJ',
          slotId: adult.id,
        }, {
          relationship: 'CHILD',
          firstName: 'Sam',
          lastName: 'Smith',
          age: 8,
          programCode: 'KIDS_BJJ',
          slotId: childSlot.id,
        }],
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(result.lead.lines).toHaveLength(2)
      const selfLine = result.lead.lines.find(line => line.relationship === 'SELF')!
      const childLine = result.lead.lines.find(line => line.relationship === 'CHILD')!
      expect(selfLine.program?.code).toBe('ADULT_BJJ')
      expect(childLine.program?.code).toBe('KIDS_BJJ')
      expect(selfLine.trials).toHaveLength(1)
      expect(childLine.trials).toHaveLength(1)
      expect(selfLine.trials[0]?.label).not.toBe(childLine.trials[0]?.label)
      expect(result.lead.utmSource).toBe('meta')
      expect(result.bookings).toHaveLength(2)
      const tasks = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.leadId, result.lead.id))
      const initial = tasks.filter(task => task.purpose === 'INITIAL_SCHEDULE')
      expect(initial.filter(task => task.status === 'PENDING')).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('books multiple children under one contact with no fake guardian line', async () => {
    const testDb = await openTestDatabase()
    try {
      const young = await kidsSlot(testDb.db, 6)
      const older = await kidsSlot(testDb.db, 14)
      const result = await bookPublicHousehold(testDb.db, {
        firstName: 'Kim',
        lastName: 'Guardian',
        phone: '8015556104',
        members: [{
          relationship: 'CHILD',
          firstName: 'Riley',
          age: 6,
          programCode: 'KIDS_BJJ',
          slotId: young.id,
        }, {
          relationship: 'CHILD',
          firstName: 'Casey',
          age: 14,
          programCode: 'KIDS_BJJ',
          slotId: older.id,
        }],
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(result.lead.lines).toHaveLength(2)
      expect(result.lead.lines.every(line => line.relationship === 'CHILD')).toBe(true)
      expect(result.lead.lines.some(line => line.firstName === 'Kim')).toBe(false)
      expect(result.lead.lines.map(line => line.firstName).sort()).toEqual(['Casey', 'Riley'])
      const [program] = await testDb.db.select().from(programs).where(eq(programs.id, result.lead.lines[0]!.programId))
      expect(program?.code).toBe('KIDS_BJJ')
    } finally {
      await testDb.close()
    }
  })

  it('keeps all lines on one LeadHeader and rolls back when a later trial fails', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await adultSlot(testDb.db)
      const childSlot = await kidsSlot(testDb.db, 9)
      const original = leadService.createTrial.bind(leadService)
      let calls = 0
      const spy = vi.spyOn(leadService, 'createTrial').mockImplementation(async (...args) => {
        calls += 1
        if (calls === 2) {
          throw new DomainError('forced booking failure')
        }
        return original(...args)
      })
      await expect(bookPublicHousehold(testDb.db, {
        firstName: 'Taylor',
        lastName: 'Fail',
        phone: '8015556105',
        members: [{
          relationship: 'SELF',
          firstName: 'Taylor',
          lastName: 'Fail',
          programCode: 'ADULT_BJJ',
          slotId: adult.id,
        }, {
          relationship: 'CHILD',
          firstName: 'Drew',
          age: 9,
          programCode: 'KIDS_BJJ',
          slotId: childSlot.id,
        }],
      }, { nowMs: MONDAY_AFTERNOON_MDT })).rejects.toBeInstanceOf(DomainError)
      const leftoverLeads = await testDb.db.select().from(leads).where(eq(leads.phone, '8015556105'))
      const leftoverLines = await testDb.db.select().from(leadLines)
      const leftoverTrials = await testDb.db.select().from(trials)
      const leftoverKeys = await testDb.db.select().from(publicBookingSubmissions)
      expect(leftoverLeads).toHaveLength(0)
      expect(leftoverLines.some(line => line.firstName === 'Taylor' || line.firstName === 'Drew')).toBe(false)
      expect(leftoverTrials.some(trial => trial.notes === 'Booked from public /trial.')).toBe(false)
      expect(leftoverKeys).toHaveLength(0)
      spy.mockRestore()
    } finally {
      await testDb.close()
    }
  })

  it('still supports the legacy one-person Adult booking helper', async () => {
    const testDb = await openTestDatabase()
    try {
      const slot = await adultSlot(testDb.db)
      const result = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Legacy',
        lastName: 'Adult',
        phone: '8015556106',
        slotId: slot.id,
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(result.lead.lines[0]?.relationship).toBe('SELF')
      expect(result.slot.id).toBe(slot.id)
    } finally {
      await testDb.close()
    }
  })
})
