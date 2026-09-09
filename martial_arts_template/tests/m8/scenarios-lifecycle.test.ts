import { describe, expect, it } from 'vitest'
import { reverseConversion } from '../../server/services/conversion'
import { getLead, rescheduleTrial, setTrialOutcome } from '../../server/services/leads'
import { changeLeadLineStatus } from '../../server/services/lead-lines'
import { openTestDatabase } from '../helpers/db'
import {
  SCENARIO_NOW,
  activeConversions,
  adminActor,
  adultNoGiSlot,
  adultSlot,
  convertHouseholdLine,
  createGuardianChildHousehold,
  createParentChildHousehold,
  createSingleAdultHousehold,
  expectHouseholdStatus,
  expectPendingInitialCount,
  expectedFollowUpDue,
  householdClosed,
  householdStatus,
  kidsSlot,
  lineByName,
  lineByRelationship,
  markLineLost,
  openLostOutcomes,
  pendingInitialTasks,
  scheduledTrials,
  scheduleValidTrialForLine,
  trialsFor,
} from './helpers/scenarios'

describe('M8 scenarios A — single-person household', () => {
  it('A1 adult lead has one SELF line, no trial, and household stays New', async () => {
    const testDb = await openTestDatabase()
    try {
      const lead = await createSingleAdultHousehold(testDb.db)
      expect(lead.lines).toHaveLength(1)
      expect(lead.lines[0]?.relationship).toBe('SELF')
      expect(lead.lines[0]?.trials).toHaveLength(0)
      expect(activeConversions(lead.lines[0])).toHaveLength(0)
      expect(openLostOutcomes(lead.lines[0])).toHaveLength(0)
      expect(householdClosed(lead)).toBe(false)
      expect(lead.closedAt).toBeNull()
      expectHouseholdStatus(lead, 'ACTIVE', 'Active')
    } finally {
      await testDb.close()
    }
  })

  it('single adult schedules, reschedules, attends, converts, and ADMIN reverses', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const created = await createSingleAdultHousehold(testDb.db, { firstName: 'Alex' })
      const lineId = created.lines[0]!.id

      const scheduled = await scheduleValidTrialForLine(testDb.db, created.id, lineId, 'ADULT_BJJ')
      const firstTrial = scheduledTrials(scheduled.lines[0])[0]!
      expect(scheduled.trials.find(trial => trial.id === firstTrial.id)?.leadLineId).toBe(lineId)
      expect(scheduled.lines[0]?.status).toBe('TRIAL_SCHEDULED')
      expectHouseholdStatus(scheduled, 'ACTIVE', 'Active')
      expectPendingInitialCount(scheduled, 1)
      const due = new Date(pendingInitialTasks(scheduled)[0]!.dueAt).getTime()
      expect(due).toBe(expectedFollowUpDue(SCENARIO_NOW).getTime())
      expect(trialsFor(scheduled.lines[0])).toHaveLength(1)

      const later = await adultNoGiSlot(testDb.db)
      const moved = await rescheduleTrial(testDb.db, firstTrial.id, { slotId: later.id }, undefined, { nowMs: SCENARIO_NOW })
      const history = trialsFor(moved.lines[0])
      expect(history.find(trial => trial.id === firstTrial.id)?.status).toBe('CANCELLED')
      expect(history.filter(trial => trial.status === 'SCHEDULED')).toHaveLength(1)
      expect(history).toHaveLength(2)
      expectPendingInitialCount(moved, 1)
      expect(pendingInitialTasks(moved)[0]?.id).toBe(pendingInitialTasks(scheduled)[0]?.id)

      const current = scheduledTrials(moved.lines[0])[0]!
      const attended = await setTrialOutcome(testDb.db, current.id, { status: 'ATTENDED' })
      expect(trialsFor(attended.lines[0]).find(trial => trial.id === current.id)?.status).toBe('ATTENDED')
      expect(attended.lines[0]?.status).toBe('TRIAL_ATTENDED')
      expect(householdClosed(attended)).toBe(false)
      expectPendingInitialCount(attended, 0)
      expect(trialsFor(attended.lines[0])).toHaveLength(2)

      const conversion = await convertHouseholdLine(testDb.db, attended.lines[0]!, actor)
      const joined = await getLead(testDb.db, created.id)
      expect(activeConversions(joined.lines[0])).toHaveLength(1)
      expect(joined.lines[0]?.status).toBe('JOINED')
      expect(householdClosed(joined)).toBe(true)
      expectHouseholdStatus(joined, 'JOINED', 'Joined')
      expect(conversion.monthlyCents).toBe(17500)
      expectPendingInitialCount(joined, 0)

      const reversed = await reverseConversion(testDb.db, conversion.id, { note: 'Wrong person.' }, actor)
      expect(reversed.reversedAt).toBeTruthy()
      expect(reversed.monthlyCents).toBe(17500)
      const reopened = await getLead(testDb.db, created.id)
      expect(activeConversions(reopened.lines[0])).toHaveLength(0)
      expect(reopened.lines[0]?.conversions).toHaveLength(1)
      expect(reopened.lines[0]?.status).toBe('TRIAL_ATTENDED')
      expect(householdClosed(reopened)).toBe(false)
      expectHouseholdStatus(reopened, 'ACTIVE', 'Active')
    } finally {
      await testDb.close()
    }
  })
})

describe('M8 scenarios B — guardian + child', () => {
  it('B1 guardian stays header-only and the child is the only prospective member', async () => {
    const testDb = await openTestDatabase()
    try {
      const lead = await createGuardianChildHousehold(testDb.db)
      expect(lead.firstName).toBe('Pat')
      expect(lead.phone).toBeTruthy()
      expect(lead.lines).toHaveLength(1)
      expect(lead.lines[0]?.relationship).toBe('CHILD')
      expect(lead.lines[0]?.firstName).toBe('Sam')
      expect(lead.lines[0]?.program?.code).toBe('KIDS_BJJ')
      expect(lead.lines.some(line => line.relationship === 'SELF')).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('child schedules, attends, converts, is marked lost, then reopens', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const created = await createGuardianChildHousehold(testDb.db, { childFirstName: 'Sam' })
      const child = created.lines[0]!
      expect(child.relationship).toBe('CHILD')

      const scheduled = await scheduleValidTrialForLine(testDb.db, created.id, child.id, 'KIDS_BJJ', { age: 8 })
      expect(scheduledTrials(scheduled.lines[0])).toHaveLength(1)
      expectPendingInitialCount(scheduled, 1)
      expect(lineByRelationship(scheduled, 'SELF')).toBeUndefined()

      const attended = await setTrialOutcome(testDb.db, scheduledTrials(scheduled.lines[0])[0]!.id, { status: 'ATTENDED' })
      await convertHouseholdLine(testDb.db, attended.lines[0]!, actor)
      const joined = await getLead(testDb.db, created.id)
      expect(joined.firstName).toBe('Pat')
      expect(joined.lines[0]?.status).toBe('JOINED')
      expect(activeConversions(joined.lines[0])).toHaveLength(1)
      expectHouseholdStatus(joined, 'JOINED', 'Joined')

      await reverseConversion(testDb.db, activeConversions(joined.lines[0])[0]!.id, { note: 'Need lost path.' }, actor)
      await markLineLost(testDb.db, child.id, actor)
      const lost = await getLead(testDb.db, created.id)
      expect(lost.lines[0]?.status).toBe('LOST')
      expect(openLostOutcomes(lost.lines[0])).toHaveLength(1)
      expect(lost.closedAt).toBeTruthy()
      expectHouseholdStatus(lost, 'LOST', 'Lost')
      expectPendingInitialCount(lost, 0)

      await changeLeadLineStatus(testDb.db, child.id, { toStatus: 'CONTACTED', note: 'Trying again.' }, actor)
      const reopened = await getLead(testDb.db, created.id)
      expect(reopened.lines[0]?.status).toBe('CONTACTED')
      expect(reopened.closedAt).toBeNull()
      expect(householdClosed(reopened)).toBe(false)
      expect(reopened.lines[0]?.lostOutcomes?.some(row => row.reopenedAt)).toBe(true)
      expect(completedInitialTasksSafe(reopened)).toEqual(completedInitialTasksSafe(lost))
    } finally {
      await testDb.close()
    }
  })
})

function completedInitialTasksSafe(lead: Awaited<ReturnType<typeof getLead>>) {
  return (lead.followUpTasks ?? [])
    .filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'COMPLETED')
    .map(task => ({ id: task.id, outcome: task.outcome }))
}

describe('M8 scenarios C — parent + child household', () => {
  it('parent and child book together, then mixed convert/lost/reopen stays coherent', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const household = await createParentChildHousehold(testDb.db, { parentFirstName: 'Matt', childFirstName: 'Sam' })
      expect(household.lines).toHaveLength(2)
      expect(household.source).toBe('WALK_IN')
      const parent = lineByRelationship(household, 'SELF')!
      const child = lineByRelationship(household, 'CHILD')!
      expect(parent.program?.code).toBe('ADULT_BJJ')
      expect(child.program?.code).toBe('KIDS_BJJ')

      const adult = await adultSlot(testDb.db)
      const kids = await kidsSlot(testDb.db, 8, SCENARIO_NOW, adult.date)
      await scheduleValidTrialForLine(testDb.db, household.id, parent.id, 'ADULT_BJJ', { slotId: adult.id })
      await scheduleValidTrialForLine(testDb.db, household.id, child.id, 'KIDS_BJJ', { age: 8, slotId: kids.id })
      const afterSchedule = await getLead(testDb.db, household.id)
      expect(scheduledTrials(lineByName(afterSchedule, 'Matt'))).toHaveLength(1)
      expect(scheduledTrials(lineByName(afterSchedule, 'Sam'))).toHaveLength(1)
      expect(new Date(scheduledTrials(lineByName(afterSchedule, 'Matt'))[0]!.scheduledAt).getTime())
        .not.toBe(new Date(scheduledTrials(lineByName(afterSchedule, 'Sam'))[0]!.scheduledAt).getTime())
      expectPendingInitialCount(afterSchedule, 1)
      expect(pendingInitialTasks(afterSchedule)[0]?.confirmationIntros?.length).toBe(2)
      expect(pendingInitialTasks(afterSchedule)[0]?.linkedLines.map(line => line.firstName).sort()).toEqual(['Matt', 'Sam'])

      const laterAdult = await adultNoGiSlot(testDb.db)
      const dadTrial = scheduledTrials(lineByName(afterSchedule, 'Matt'))[0]!
      const moved = await rescheduleTrial(testDb.db, dadTrial.id, { slotId: laterAdult.id }, undefined, { nowMs: SCENARIO_NOW })
      expect(new Date(scheduledTrials(lineByName(moved, 'Matt'))[0]!.scheduledAt).getTime())
        .not.toBe(new Date(scheduledTrials(lineByName(moved, 'Sam'))[0]!.scheduledAt).getTime())
      expect(lineByName(moved, 'Sam')?.id).toBe(child.id)

      await setTrialOutcome(testDb.db, scheduledTrials(lineByName(moved, 'Matt'))[0]!.id, { status: 'ATTENDED' })
      await convertHouseholdLine(testDb.db, parent, actor)
      const parentJoined = await getLead(testDb.db, household.id)
      expect(lineByName(parentJoined, 'Matt')?.status).toBe('JOINED')
      expect(lineByName(parentJoined, 'Sam')?.status).not.toBe('JOINED')
      expect(parentJoined.closedAt).toBeNull()
      expectHouseholdStatus(parentJoined, 'ACTIVE_MIXED', 'Active · mixed outcomes')

      await markLineLost(testDb.db, child.id, actor)
      const mixedClosed = await getLead(testDb.db, household.id)
      expect(lineByName(mixedClosed, 'Matt')?.status).toBe('JOINED')
      expect(lineByName(mixedClosed, 'Sam')?.status).toBe('LOST')
      expect(activeConversions(lineByName(mixedClosed, 'Matt'))).toHaveLength(1)
      expect(openLostOutcomes(lineByName(mixedClosed, 'Sam'))).toHaveLength(1)
      expect(mixedClosed.closedAt).toBeTruthy()
      expectHouseholdStatus(mixedClosed, 'CLOSED_MIXED', 'Closed · mixed outcomes')
      expect(householdStatus(mixedClosed).label).not.toBe('Trial attended')

      await changeLeadLineStatus(testDb.db, child.id, { toStatus: 'CONTACTED', note: 'Reopened child.' }, actor)
      const childReopened = await getLead(testDb.db, household.id)
      expect(lineByName(childReopened, 'Matt')?.status).toBe('JOINED')
      expect(lineByName(childReopened, 'Sam')?.status).toBe('CONTACTED')
      expect(childReopened.closedAt).toBeNull()
      expectHouseholdStatus(childReopened, 'ACTIVE_MIXED', 'Active · mixed outcomes')
      expect(lineByName(childReopened, 'Sam')?.lostOutcomes?.some(row => row.reopenedAt)).toBe(true)
    } finally {
      await testDb.close()
    }
  })
})
