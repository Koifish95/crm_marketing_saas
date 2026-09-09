import { describe, expect, it } from 'vitest'
import { getLead, rescheduleTrial, setTrialOutcome } from '../../server/services/leads'
import { completeFollowUpTask } from '../../server/services/follow-up'
import { openTestDatabase } from '../helpers/db'
import {
  SCENARIO_NOW,
  adminActor,
  adultNoGiSlot,
  bookPublicParentChild,
  convertHouseholdLine,
  createParentChildHousehold,
  createSingleAdultHousehold,
  expectPendingInitialCount,
  lineByName,
  lineByRelationship,
  pendingInitialTasks,
  scheduledTrials,
  scheduleValidTrialForLine,
} from './helpers/scenarios'

describe('M8 scenarios F — household Follow-Up consolidation', () => {
  it('F1 one scheduled Trial creates one pending household confirmation call', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createSingleAdultHousehold(testDb.db)
      await scheduleValidTrialForLine(testDb.db, created.id, created.lines[0]!.id, 'ADULT_BJJ')
      const lead = await getLead(testDb.db, created.id)
      expectPendingInitialCount(lead, 1)
      expect(pendingInitialTasks(lead)[0]?.linkedLines.map(line => line.id)).toEqual([created.lines[0]!.id])
    } finally {
      await testDb.close()
    }
  })

  it('F2 two Trials booked together share one pending household call', async () => {
    const testDb = await openTestDatabase()
    try {
      const booked = await bookPublicParentChild(testDb.db)
      expectPendingInitialCount(booked.lead, 1)
      expect(pendingInitialTasks(booked.lead)[0]?.confirmationIntros?.length).toBe(2)
      expect(pendingInitialTasks(booked.lead)[0]?.linkedLines).toHaveLength(2)
    } finally {
      await testDb.close()
    }
  })

  it('F3 later Trial is absorbed while a compatible pending call exists', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createParentChildHousehold(testDb.db)
      const parent = lineByRelationship(household, 'SELF')!
      const child = lineByRelationship(household, 'CHILD')!
      await scheduleValidTrialForLine(testDb.db, household.id, parent.id, 'ADULT_BJJ')
      const afterParent = await getLead(testDb.db, household.id)
      const originalId = pendingInitialTasks(afterParent)[0]!.id
      await scheduleValidTrialForLine(testDb.db, household.id, child.id, 'KIDS_BJJ', { age: 8 })
      const afterChild = await getLead(testDb.db, household.id)
      expectPendingInitialCount(afterChild, 1)
      expect(pendingInitialTasks(afterChild)[0]?.id).toBe(originalId)
      expect(pendingInitialTasks(afterChild)[0]?.linkedLines.map(line => line.firstName).sort()).toEqual(['Matt', 'Sam'])
    } finally {
      await testDb.close()
    }
  })

  it('F4 completed confirmation is unchanged when a new Trial later needs a call', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const household = await createParentChildHousehold(testDb.db)
      const parent = lineByRelationship(household, 'SELF')!
      const child = lineByRelationship(household, 'CHILD')!
      await scheduleValidTrialForLine(testDb.db, household.id, parent.id, 'ADULT_BJJ')
      const first = await getLead(testDb.db, household.id)
      await completeFollowUpTask(testDb.db, pendingInitialTasks(first)[0]!.id, { outcome: 'REACHED', notes: 'Dad confirmed.' }, actor)
      const completed = await getLead(testDb.db, household.id)
      const historyId = completed.followUpTasks.find(task => task.status === 'COMPLETED')!.id
      await scheduleValidTrialForLine(testDb.db, household.id, child.id, 'KIDS_BJJ', { age: 8 })
      const later = await getLead(testDb.db, household.id)
      expect(later.followUpTasks.find(task => task.id === historyId)?.status).toBe('COMPLETED')
      expect(later.followUpTasks.find(task => task.id === historyId)?.notes).toContain('Dad confirmed.')
      expectPendingInitialCount(later, 1)
      expect(pendingInitialTasks(later)[0]?.id).not.toBe(historyId)
    } finally {
      await testDb.close()
    }
  })

  it('F5-F7 reschedule and cancel reconcile the shared pending call without duplicates', async () => {
    const testDb = await openTestDatabase()
    try {
      const booked = await bookPublicParentChild(testDb.db)
      const taskId = pendingInitialTasks(booked.lead)[0]!.id
      const parent = lineByRelationship(booked.lead, 'SELF')!
      const child = lineByRelationship(booked.lead, 'CHILD')!
      const later = await adultNoGiSlot(testDb.db)
      const moved = await rescheduleTrial(testDb.db, scheduledTrials(parent)[0]!.id, { slotId: later.id }, undefined, { nowMs: SCENARIO_NOW })
      expectPendingInitialCount(moved, 1)
      expect(pendingInitialTasks(moved)[0]?.id).toBe(taskId)

      const afterOneCancel = await setTrialOutcome(testDb.db, scheduledTrials(lineByName(moved, 'Matt'))[0]!.id, { status: 'CANCELLED' })
      expectPendingInitialCount(afterOneCancel, 1)
      expect(pendingInitialTasks(afterOneCancel)[0]?.id).toBe(taskId)
      expect(scheduledTrials(lineByName(afterOneCancel, 'Sam'))).toHaveLength(1)

      const afterAll = await setTrialOutcome(testDb.db, scheduledTrials(lineByName(afterOneCancel, 'Sam'))[0]!.id, { status: 'CANCELLED' })
      expectPendingInitialCount(afterAll, 0)
      expect(afterAll.followUpTasks.find(task => task.id === taskId)?.status).toBe('CANCELLED')
      expect(child.id).toBe(lineByName(afterAll, 'Sam')?.id)
    } finally {
      await testDb.close()
    }
  })

  it('F8 converting one sibling keeps confirmation work for the remaining scheduled Trial', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const booked = await bookPublicParentChild(testDb.db)
      const parent = lineByRelationship(booked.lead, 'SELF')!
      const taskId = pendingInitialTasks(booked.lead)[0]!.id
      await setTrialOutcome(testDb.db, scheduledTrials(parent)[0]!.id, { status: 'ATTENDED' })
      await convertHouseholdLine(testDb.db, parent, actor)
      const after = await getLead(testDb.db, booked.lead.id)
      expect(lineByName(after, 'Matt')?.status).toBe('JOINED')
      expect(scheduledTrials(lineByName(after, 'Sam'))).toHaveLength(1)
      expectPendingInitialCount(after, 1)
      expect(pendingInitialTasks(after)[0]?.id).toBe(taskId)
    } finally {
      await testDb.close()
    }
  })
})
