import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { introAvailabilityRules, programs, trials } from '../../server/database/schema'
import { createIntroException, listPublicSlots, updateIntroRule } from '../../server/services/availability'
import { DomainError } from '../../server/services/errors'
import { createLead, createTrial, rescheduleTrial, scheduleTrialFromSlot } from '../../server/services/leads'
import { openTestDatabase } from '../helpers/db'

const MONDAY_AFTERNOON_MDT = Date.parse('2026-08-31T21:00:00.000Z')

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

describe('M4 staff trial reschedule', () => {
  it('reschedules an Adult trial onto a bookable slot and updates the class name', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await programId(testDb.db, 'ADULT_BJJ')
      const lead = await createLead(testDb.db, {
        firstName: 'Alex',
        phone: '8015550200',
        programId: adultId,
        source: 'WALK_IN',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const gi = slots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      const noGi = slots.find(slot => slot.date === '2026-09-01' && slot.name.includes('No-Gi') && slot.startMinute === 18 * 60)!
      expect(gi).toBeTruthy()
      expect(noGi).toBeTruthy()

      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(gi.scheduledAt),
        label: `${gi.name} · ${gi.date}`,
      })
      const original = scheduled.trials.find(trial => trial.status === 'SCHEDULED')!
      expect(original.label).toContain('with Gi')

      const moved = await rescheduleTrial(testDb.db, original.id, { slotId: noGi.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT })
      const cancelled = moved.trials.find(trial => trial.id === original.id)
      const next = moved.trials.find(trial => trial.status === 'SCHEDULED')
      expect(cancelled?.status).toBe('CANCELLED')
      expect(next).toBeTruthy()
      expect(next!.id).not.toBe(original.id)
      expect(next!.label).toContain('No-Gi')
      expect(next!.label).not.toContain('with Gi')
      expect(new Date(next!.scheduledAt).getTime()).toBe(new Date(noGi.scheduledAt).getTime())
      expect(moved.status).toBe('TRIAL_SCHEDULED')
    } finally {
      await testDb.close()
    }
  })

  it('rejects arbitrary slot ids and client-invented times', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await programId(testDb.db, 'ADULT_BJJ')
      const lead = await createLead(testDb.db, {
        firstName: 'Pat',
        phone: '8015550201',
        programId: adultId,
        source: 'PHONE',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const slot = slots[0]!
      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(slot.scheduledAt),
        label: slot.name,
      })
      const trial = scheduled.trials.find(item => item.status === 'SCHEDULED')!

      await expect(rescheduleTrial(testDb.db, trial.id, { slotId: 'rule:999:2026-08-31' }, undefined, { nowMs: MONDAY_AFTERNOON_MDT }))
        .rejects.toBeInstanceOf(DomainError)
      await expect(rescheduleTrial(testDb.db, trial.id, { slotId: 'not-a-slot' }, undefined, { nowMs: MONDAY_AFTERNOON_MDT }))
        .rejects.toBeInstanceOf(DomainError)

      const [still] = await testDb.db.select().from(trials).where(eq(trials.id, trial.id))
      expect(still?.status).toBe('SCHEDULED')
    } finally {
      await testDb.close()
    }
  })

  it('cannot reschedule onto a disabled class or a closed date', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await programId(testDb.db, 'ADULT_BJJ')
      const lead = await createLead(testDb.db, {
        firstName: 'Kim',
        phone: '8015550202',
        programId: adultId,
        source: 'WEBSITE',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const mondayGi = slots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      const tuesdayNoGi = slots.find(slot => slot.date === '2026-09-01' && slot.name.includes('No-Gi') && slot.startMinute === 18 * 60)!
      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(mondayGi.scheduledAt),
        label: mondayGi.name,
      })
      const trial = scheduled.trials.find(item => item.status === 'SCHEDULED')!

      const [rule] = await testDb.db.select().from(introAvailabilityRules).where(eq(introAvailabilityRules.seedKey, 'adult-tue-1800-nogi'))
      await updateIntroRule(testDb.db, rule!.id, { enabled: false })
      await expect(rescheduleTrial(testDb.db, trial.id, { slotId: tuesdayNoGi.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT }))
        .rejects.toBeInstanceOf(DomainError)

      await updateIntroRule(testDb.db, rule!.id, { enabled: true })
      await createIntroException(testDb.db, { onDate: '2026-09-01', kind: 'CLOSE_DATE' })
      await expect(rescheduleTrial(testDb.db, trial.id, { slotId: tuesdayNoGi.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT }))
        .rejects.toBeInstanceOf(DomainError)

      const [still] = await testDb.db.select().from(trials).where(eq(trials.id, trial.id))
      expect(still?.status).toBe('SCHEDULED')
    } finally {
      await testDb.close()
    }
  })

  it('keeps Kids rescheduling inside the lead’s age band', async () => {
    const testDb = await openTestDatabase()
    try {
      const kidsId = await programId(testDb.db, 'KIDS_BJJ')
      const lead = await createLead(testDb.db, {
        firstName: 'Jordan',
        phone: '8015550203',
        programId: kidsId,
        source: 'WALK_IN',
        participantFirstName: 'Sam',
        participantAge: 6,
        guardianRelationship: 'parent',
      })
      const ninjaSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 6, nowMs: MONDAY_AFTERNOON_MDT })
      const samuraiSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 9, nowMs: MONDAY_AFTERNOON_MDT })
      const firstNinja = ninjaSlots.find(slot => slot.date === '2026-08-31' && slot.name.includes('Ninjas'))!
      const laterNinja = ninjaSlots.find(slot => slot.date === '2026-09-01' && slot.name.includes('Ninjas'))!
      const samurai = samuraiSlots.find(slot => slot.name.includes('Samurai'))!
      expect(firstNinja).toBeTruthy()
      expect(laterNinja).toBeTruthy()
      expect(samurai).toBeTruthy()

      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(firstNinja.scheduledAt),
        label: firstNinja.name,
      })
      const trial = scheduled.trials.find(item => item.status === 'SCHEDULED')!

      await expect(rescheduleTrial(testDb.db, trial.id, { slotId: samurai.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT }))
        .rejects.toBeInstanceOf(DomainError)

      const moved = await rescheduleTrial(testDb.db, trial.id, { slotId: laterNinja.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT })
      const next = moved.trials.find(item => item.status === 'SCHEDULED')
      expect(next?.label).toContain('Ninjas')
      expect(next?.label).not.toContain('Samurai')
    } finally {
      await testDb.close()
    }
  })

  it('schedules a staff Trial from a bookable slot, not an arbitrary time', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await programId(testDb.db, 'ADULT_BJJ')
      const lead = await createLead(testDb.db, {
        firstName: 'Riley',
        phone: '8015550204',
        programId: adultId,
        source: 'WALK_IN',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
      const gi = slots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      expect(gi).toBeTruthy()

      const booked = await scheduleTrialFromSlot(testDb.db, lead.id, { slotId: gi.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT })
      const trial = booked.trials.find(item => item.status === 'SCHEDULED')
      expect(trial).toBeTruthy()
      expect(trial!.label).toContain('with Gi')
      expect(trial!.label).toContain('2026-08-31')
      expect(new Date(trial!.scheduledAt).getTime()).toBe(new Date(gi.scheduledAt).getTime())
      expect(booked.status).toBe('TRIAL_SCHEDULED')

      await expect(scheduleTrialFromSlot(testDb.db, lead.id, { slotId: 'not-a-slot' }, undefined, { nowMs: MONDAY_AFTERNOON_MDT }))
        .rejects.toBeInstanceOf(DomainError)
    } finally {
      await testDb.close()
    }
  })

  it('keeps Kids staff scheduling inside the lead’s age band', async () => {
    const testDb = await openTestDatabase()
    try {
      const kidsId = await programId(testDb.db, 'KIDS_BJJ')
      const lead = await createLead(testDb.db, {
        firstName: 'Morgan',
        phone: '8015550205',
        programId: kidsId,
        source: 'WALK_IN',
        participantFirstName: 'Sam',
        participantAge: 6,
        guardianRelationship: 'parent',
      })
      const ninjaSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 6, nowMs: MONDAY_AFTERNOON_MDT })
      const samuraiSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 9, nowMs: MONDAY_AFTERNOON_MDT })
      const ninja = ninjaSlots.find(slot => slot.date === '2026-08-31' && slot.name.includes('Ninjas'))!
      const samurai = samuraiSlots.find(slot => slot.name.includes('Samurai'))!

      await expect(scheduleTrialFromSlot(testDb.db, lead.id, { slotId: samurai.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT }))
        .rejects.toBeInstanceOf(DomainError)

      const booked = await scheduleTrialFromSlot(testDb.db, lead.id, { slotId: ninja.id }, undefined, { nowMs: MONDAY_AFTERNOON_MDT })
      const trial = booked.trials.find(item => item.status === 'SCHEDULED')
      expect(trial?.label).toContain('Ninjas')
      expect(trial?.label).not.toContain('Samurai')
    } finally {
      await testDb.close()
    }
  })
})
