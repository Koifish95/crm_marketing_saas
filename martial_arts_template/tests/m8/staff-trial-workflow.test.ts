import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { programs, trials } from '../../server/database/schema'
import { listPublicSlots } from '../../server/services/availability'
import { DomainError } from '../../server/services/errors'
import { addLeadLineToHousehold } from '../../server/services/lead-lines'
import {
  createLead,
  getLead,
  scheduleTrialFromSlot,
  setTrialOutcome,
  rescheduleTrial,
} from '../../server/services/leads'
import { openTestDatabase } from '../helpers/db'

const MONDAY = Date.parse('2026-08-31T21:00:00.000Z')

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

function scheduled(lead: { trials: Array<{ id: number, status: string, leadLineId?: number | null, label?: string | null }> }) {
  return lead.trials.find(trial => trial.status === 'SCHEDULED')!
}

describe('M8 staff Trial lifecycle per LeadLine', () => {
  it('schedules a staff-created line onto configured availability and rejects arbitrary slots', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'StaffLead',
        phone: '8015558100',
        programId: adult,
        source: 'WALK_IN',
      })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Kiddo',
        programId: kids,
        age: 8,
      })
      const adultSlots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const gi = adultSlots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      const booked = await scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: gi.id,
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const dadTrial = booked.lines.find(line => line.relationship === 'SELF')?.trials.find(trial => trial.status === 'SCHEDULED')
      expect(dadTrial).toBeTruthy()
      expect(dadTrial?.label).toContain('with Gi')
      expect(booked.lines.find(line => line.id === child.id)?.trials).toHaveLength(0)

      await expect(scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: 'not-a-slot',
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })).rejects.toBeInstanceOf(DomainError)

      const kidsSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 8, nowMs: MONDAY })
      await expect(scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: kidsSlots[0]!.id,
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })).rejects.toBeInstanceOf(DomainError)
    } finally {
      await testDb.close()
    }
  })

  it('reschedules, preserves history, cancels, marks outcomes, and schedules another trial', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Lifecycle',
        phone: '8015558101',
        programId: adult,
        source: 'WALK_IN',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const gi = slots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      const noGi = slots.find(slot => slot.date === '2026-09-01' && slot.name.includes('No-Gi') && slot.startMinute === 18 * 60)!
      const first = await scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: gi.id,
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const original = scheduled(first)
      const moved = await rescheduleTrial(testDb.db, original.id, { slotId: noGi.id }, undefined, { nowMs: MONDAY })
      expect(moved.trials.find(trial => trial.id === original.id)?.status).toBe('CANCELLED')
      expect(scheduled(moved).id).not.toBe(original.id)
      expect(scheduled(moved).label).toContain('No-Gi')

      const cancelledLead = await createLead(testDb.db, {
        firstName: 'CancelCase',
        phone: '8015558102',
        programId: adult,
        source: 'WALK_IN',
      })
      const toCancel = await scheduleTrialFromSlot(testDb.db, cancelledLead.id, {
        slotId: gi.id,
        leadLineId: cancelledLead.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const afterCancel = await setTrialOutcome(testDb.db, scheduled(toCancel).id, { status: 'CANCELLED' })
      expect(afterCancel.trials[0]?.status).toBe('CANCELLED')

      const attendLead = await createLead(testDb.db, {
        firstName: 'AttendCase',
        phone: '8015558103',
        programId: adult,
        source: 'WALK_IN',
      })
      const toAttend = await scheduleTrialFromSlot(testDb.db, attendLead.id, {
        slotId: gi.id,
        leadLineId: attendLead.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const afterAttend = await setTrialOutcome(testDb.db, scheduled(toAttend).id, { status: 'ATTENDED' })
      expect(afterAttend.trials[0]?.status).toBe('ATTENDED')
      expect(afterAttend.lines[0]?.status).toBe('TRIAL_ATTENDED')
      const again = await scheduleTrialFromSlot(testDb.db, attendLead.id, {
        slotId: noGi.id,
        leadLineId: attendLead.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      expect(again.trials.filter(trial => trial.status === 'SCHEDULED')).toHaveLength(1)
      expect(again.trials.filter(trial => trial.status === 'ATTENDED')).toHaveLength(1)
      expect(again.lines[0]?.status).toBe('TRIAL_SCHEDULED')
      expect(again.status).toBe('TRIAL_SCHEDULED')

      const noShowLead = await createLead(testDb.db, {
        firstName: 'NoShowCase',
        phone: '8015558104',
        programId: adult,
        source: 'WALK_IN',
      })
      const toNoShow = await scheduleTrialFromSlot(testDb.db, noShowLead.id, {
        slotId: gi.id,
        leadLineId: noShowLead.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const afterNoShow = await setTrialOutcome(testDb.db, scheduled(toNoShow).id, { status: 'NO_SHOW' })
      expect(afterNoShow.trials[0]?.status).toBe('NO_SHOW')
    } finally {
      await testDb.close()
    }
  })

  it('keeps sibling LeadLine trials independent', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Mixed',
        phone: '8015558105',
        programId: adult,
        source: 'WALK_IN',
      })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Sibling',
        programId: kids,
        age: 9,
      })
      const adultSlots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const kidsSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 9, nowMs: MONDAY })
      await scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: adultSlots[0]!.id,
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      await scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: kidsSlots[0]!.id,
        leadLineId: child.id,
      }, undefined, { nowMs: MONDAY })
      const lead = await getLead(testDb.db, household.id)
      const dad = lead.lines.find(line => line.relationship === 'SELF')!
      const kid = lead.lines.find(line => line.id === child.id)!
      expect(dad.trials.filter(trial => trial.status === 'SCHEDULED')).toHaveLength(1)
      expect(kid.trials.filter(trial => trial.status === 'SCHEDULED')).toHaveLength(1)
      expect(dad.trials[0]?.id).not.toBe(kid.trials[0]?.id)
      await setTrialOutcome(testDb.db, dad.trials[0]!.id, { status: 'CANCELLED' })
      const after = await getLead(testDb.db, household.id)
      expect(after.lines.find(line => line.id === dad.id)?.trials[0]?.status).toBe('CANCELLED')
      expect(after.lines.find(line => line.id === kid.id)?.trials.find(trial => trial.status === 'SCHEDULED')).toBeTruthy()
      const leftover = await testDb.db.select().from(trials).where(eq(trials.leadId, household.id))
      expect(leftover).toHaveLength(2)
    } finally {
      await testDb.close()
    }
  })
})
