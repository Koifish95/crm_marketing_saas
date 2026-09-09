import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { followUpTaskLines, membershipOfferings, programs, users } from '../../server/database/schema'
import { listPublicSlots } from '../../server/services/availability'
import { convertLeadLine } from '../../server/services/conversion'
import {
  completeFollowUpTask,
  listFollowUpTasks,
} from '../../server/services/follow-up'
import { addLeadLineToHousehold, updateLeadLine } from '../../server/services/lead-lines'
import {
  createLead,
  createTrial,
  getLead,
  rescheduleTrial,
  scheduleTrialFromSlot,
  setTrialOutcome,
} from '../../server/services/leads'
import { bookPublicHousehold } from '../../server/services/public-trial'
import type { SessionUser } from '../../server/services/authorization'
import { openTestDatabase } from '../helpers/db'

const MONDAY = Date.parse('2026-08-31T21:00:00.000Z')
const THURSDAY = Date.parse('2026-09-03T16:00:00.000Z')

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

async function adminActor(db: Awaited<ReturnType<typeof openTestDatabase>>['db']): Promise<SessionUser> {
  const [admin] = await db.select().from(users).where(eq(users.username, 'admin'))
  return { id: admin!.id, email: admin!.email, displayName: admin!.displayName, role: 'ADMIN' }
}

function pendingInitial(lead: { followUpTasks: Array<{ purpose?: string, status: string, id: number, trialId?: number | null }> }) {
  return lead.followUpTasks.find(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')
}

describe('M8 household confirmation Follow-Up', () => {
  it('creates one pending household call for one trial and for a parent+child public booking', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const one = await createLead(testDb.db, {
        firstName: 'Solo',
        phone: '8015558200',
        programId: adult,
        source: 'WALK_IN',
      })
      await createTrial(testDb.db, one.id, {
        scheduledAt: new Date(MONDAY + 86_400_000),
        leadLineId: one.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const afterOne = await getLead(testDb.db, one.id)
      expect(afterOne.followUpTasks.filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')).toHaveLength(1)

      const adultSlots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const kidsSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 8, nowMs: MONDAY })
      const booked = await bookPublicHousehold(testDb.db, {
        firstName: 'Matt',
        lastName: 'Smith',
        phone: '8015558201',
        members: [{
          relationship: 'SELF',
          firstName: 'Matt',
          lastName: 'Smith',
          programCode: 'ADULT_BJJ',
          slotId: adultSlots[0]!.id,
        }, {
          relationship: 'CHILD',
          firstName: 'Sam',
          lastName: 'Smith',
          age: 8,
          programCode: 'KIDS_BJJ',
          slotId: kidsSlots[0]!.id,
        }],
      }, { nowMs: MONDAY })
      expect(booked.lead.lines).toHaveLength(2)
      const pending = booked.lead.followUpTasks.filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')
      expect(pending).toHaveLength(1)
      const links = await testDb.db.select().from(followUpTaskLines).where(eq(followUpTaskLines.taskId, pending[0]!.id))
      expect(links).toHaveLength(2)
      expect(pending[0]!.confirmationIntros?.length).toBe(2)
      expect(pending[0]!.linkedLines.map(line => line.firstName).sort()).toEqual(['Matt', 'Sam'])
    } finally {
      await testDb.close()
    }
  })

  it('absorbs a later Trial into a compatible pending household call and does not rewrite completed history', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Later',
        phone: '8015558202',
        programId: adult,
        source: 'WALK_IN',
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(MONDAY + 86_400_000),
        label: 'Dad intro',
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const afterDad = await getLead(testDb.db, household.id)
      const original = pendingInitial(afterDad)!
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Daughter',
        programId: kids,
        age: 7,
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(THURSDAY + 86_400_000),
        label: 'Daughter intro',
        leadLineId: child.id,
      }, undefined, { nowMs: THURSDAY })
      const afterChild = await getLead(testDb.db, household.id)
      const still = pendingInitial(afterChild)!
      expect(still.id).toBe(original.id)
      expect(new Date(still.dueAt).getTime()).toBe(new Date(original.dueAt).getTime())
      expect(afterChild.followUpTasks.filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')).toHaveLength(1)
      expect(still.linkedLines.map(line => line.firstName).sort()).toEqual(['Daughter', 'Later'])

      await completeFollowUpTask(testDb.db, still.id, { outcome: 'REACHED', notes: 'Confirmed both.' }, actor)
      const completed = await getLead(testDb.db, household.id)
      const history = completed.followUpTasks.find(task => task.id === still.id)!
      expect(history.status).toBe('COMPLETED')
      expect(history.outcome).toBe('REACHED')
      expect(history.notes).toContain('Confirmed both.')

      const extra = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'NewKid',
        programId: kids,
        age: 10,
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(THURSDAY + 172_800_000),
        leadLineId: extra.id,
      }, undefined, { nowMs: THURSDAY })
      const afterNew = await getLead(testDb.db, household.id)
      expect(afterNew.followUpTasks.find(task => task.id === still.id)?.status).toBe('COMPLETED')
      expect(afterNew.followUpTasks.filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')).toHaveLength(1)
      expect(afterNew.followUpTasks.find(task => task.status === 'PENDING')?.id).not.toBe(still.id)
    } finally {
      await testDb.close()
    }
  })

  it('reschedules one linked Trial without a duplicate call and cancels only when no confirmation work remains', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultSlots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const kidsSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 8, nowMs: MONDAY })
      const gi = adultSlots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      const noGi = adultSlots.find(slot => slot.date === '2026-09-01' && slot.name.includes('No-Gi') && slot.startMinute === 18 * 60)!
      const booked = await bookPublicHousehold(testDb.db, {
        firstName: 'House',
        lastName: 'Call',
        phone: '8015558203',
        members: [{
          relationship: 'SELF',
          firstName: 'Dad',
          programCode: 'ADULT_BJJ',
          slotId: gi.id,
        }, {
          relationship: 'CHILD',
          firstName: 'Kid',
          age: 8,
          programCode: 'KIDS_BJJ',
          slotId: kidsSlots[0]!.id,
        }],
      }, { nowMs: MONDAY })
      const taskId = pendingInitial(booked.lead)!.id
      const dadLine = booked.lead.lines.find(line => line.relationship === 'SELF')!
      const kidLine = booked.lead.lines.find(line => line.relationship === 'CHILD')!
      const dadTrial = dadLine.trials.find(trial => trial.status === 'SCHEDULED')!
      const kidTrial = kidLine.trials.find(trial => trial.status === 'SCHEDULED')!

      const moved = await rescheduleTrial(testDb.db, dadTrial.id, { slotId: noGi.id }, undefined, { nowMs: MONDAY })
      expect(pendingInitial(moved)?.id).toBe(taskId)
      expect(moved.followUpTasks.filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')).toHaveLength(1)

      const dadRescheduled = moved.lines.find(line => line.id === dadLine.id)!.trials.find(trial => trial.status === 'SCHEDULED')!
      const afterDadCancel = await setTrialOutcome(testDb.db, dadRescheduled.id, { status: 'CANCELLED' })
      expect(pendingInitial(afterDadCancel)?.id).toBe(taskId)
      expect(afterDadCancel.lines.find(line => line.id === kidLine.id)?.trials.some(trial => trial.status === 'SCHEDULED')).toBe(true)

      const afterAll = await setTrialOutcome(testDb.db, kidTrial.id, { status: 'CANCELLED' })
      expect(pendingInitial(afterAll)).toBeUndefined()
      expect(afterAll.followUpTasks.find(task => task.id === taskId)?.status).toBe('CANCELLED')
    } finally {
      await testDb.close()
    }
  })

  it('does not destroy household confirmation when one line is converted and a sibling still has a Trial', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      const household = await createLead(testDb.db, {
        firstName: 'ConvertMix',
        phone: '8015558204',
        programId: adult,
        source: 'WALK_IN',
      })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'StillOpen',
        programId: kids,
        age: 8,
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering!.id })
      const adultSlots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const kidsSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 8, nowMs: MONDAY })
      await scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: adultSlots[0]!.id,
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      await scheduleTrialFromSlot(testDb.db, household.id, {
        slotId: kidsSlots[0]!.id,
        leadLineId: child.id,
      }, undefined, { nowMs: MONDAY })
      const before = await getLead(testDb.db, household.id)
      const taskId = pendingInitial(before)!.id
      await convertLeadLine(testDb.db, household.lines[0]!.id, { monthlyCents: 17500, enrollmentCents: 0 })
      const after = await getLead(testDb.db, household.id)
      expect(pendingInitial(after)?.id).toBe(taskId)
      expect(after.lines.find(line => line.id === child.id)?.status).not.toBe('JOINED')
      const queue = await listFollowUpTasks(testDb.db, 'open')
      expect(queue.some(task => task.id === taskId)).toBe(true)
    } finally {
      await testDb.close()
    }
  })
})
