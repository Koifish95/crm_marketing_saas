import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { membershipOfferings, trials } from '../../server/database/schema'
import { listLostReasons } from '../../server/services/catalog'
import { convertLeadLine, markLeadLineLost } from '../../server/services/conversion'
import { DomainError } from '../../server/services/errors'
import { completeFollowUpTask } from '../../server/services/follow-up'
import { addLeadLineToHousehold, changeLeadLineStatus } from '../../server/services/lead-lines'
import { isStatusCorrection } from '../../server/services/lead-status'
import { createLead, createTrial, getLead, setTrialOutcome } from '../../server/services/leads'
import { acquisitionReport } from '../../server/services/reports'
import { householdDisplayStatus } from '../../shared/utils/labels'
import { denverYmd } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'
import {
  adminActor,
  completedInitialTasks,
  expectPendingInitialCount,
  lineByName,
  pendingInitialTasks,
  programId,
} from './helpers/scenarios'

const T1 = new Date('2026-08-31T18:00:00.000Z')
const T2 = new Date('2026-09-01T18:00:00.000Z')
const T3 = new Date('2026-09-02T18:00:00.000Z')
const RANGE = { fromYmd: '2026-01-01', toYmd: '2026-12-31' }

function latestScheduled(lead: { trials: Array<{ id: number, status: string, scheduledAt: Date | string }> }) {
  const trial = [...lead.trials].filter(row => row.status === 'SCHEDULED').sort((a, b) => b.id - a.id)[0]
  if (!trial) {
    throw new Error('Expected a scheduled trial')
  }
  return trial
}

describe('M8 repeated Trial lifecycle', () => {
  it('returns a LeadLine to TRIAL_SCHEDULED after a later Trial without rewriting history', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const actor = await adminActor(testDb.db)
      const lead = await createLead(testDb.db, {
        firstName: 'Repeat',
        lastName: 'Trial',
        phone: '8015558601',
        programId: adult,
        source: 'WALK_IN',
      })
      const lineId = lead.lines[0]!.id

      const afterFirstSchedule = await createTrial(testDb.db, lead.id, {
        scheduledAt: T1,
        label: 'Trial 1',
        leadLineId: lineId,
      })
      expect(afterFirstSchedule.lines[0]?.status).toBe('TRIAL_SCHEDULED')
      expect(afterFirstSchedule.status).toBe('TRIAL_SCHEDULED')
      expect(householdDisplayStatus(afterFirstSchedule).key).toBe('ACTIVE')
      const trial1 = latestScheduled(afterFirstSchedule)
      expectPendingInitialCount(afterFirstSchedule, 1)
      const firstTaskId = pendingInitialTasks(afterFirstSchedule)[0]!.id
      await completeFollowUpTask(testDb.db, firstTaskId, { outcome: 'REACHED', notes: 'Confirmed trial 1.' }, actor)

      const afterFirstAttend = await setTrialOutcome(testDb.db, trial1.id, { status: 'ATTENDED' })
      expect(afterFirstAttend.lines[0]?.status).toBe('TRIAL_ATTENDED')
      expect(afterFirstAttend.status).toBe('TRIAL_ATTENDED')
      expect(afterFirstAttend.trials.find(trial => trial.id === trial1.id)?.status).toBe('ATTENDED')
      expectPendingInitialCount(afterFirstAttend, 0)
      expect(completedInitialTasks(afterFirstAttend)).toHaveLength(1)
      expect(completedInitialTasks(afterFirstAttend)[0]?.id).toBe(firstTaskId)
      expect(completedInitialTasks(afterFirstAttend)[0]?.status).toBe('COMPLETED')

      const afterSecondSchedule = await createTrial(testDb.db, lead.id, {
        scheduledAt: T2,
        label: 'Trial 2',
        leadLineId: lineId,
      })
      expect(afterSecondSchedule.lines[0]?.status).toBe('TRIAL_SCHEDULED')
      expect(afterSecondSchedule.status).toBe('TRIAL_SCHEDULED')
      expect(householdDisplayStatus(afterSecondSchedule).key).toBe('ACTIVE')
      const trial2 = latestScheduled(afterSecondSchedule)
      expect(trial2.id).not.toBe(trial1.id)
      expect(afterSecondSchedule.trials.find(trial => trial.id === trial1.id)?.status).toBe('ATTENDED')
      expect(afterSecondSchedule.trials.find(trial => trial.id === trial1.id)?.label).toBe('Trial 1')
      expectPendingInitialCount(afterSecondSchedule, 1)
      expect(pendingInitialTasks(afterSecondSchedule)[0]?.id).not.toBe(firstTaskId)
      expect(completedInitialTasks(afterSecondSchedule)).toHaveLength(1)
      expect(completedInitialTasks(afterSecondSchedule)[0]?.status).toBe('COMPLETED')
      expect(afterSecondSchedule.lines[0]?.statusHistory.some(row =>
        row.fromStatus === 'TRIAL_ATTENDED' && row.toStatus === 'TRIAL_SCHEDULED',
      )).toBe(true)

      const afterSecondAttend = await setTrialOutcome(testDb.db, trial2.id, { status: 'ATTENDED' })
      expect(afterSecondAttend.lines[0]?.status).toBe('TRIAL_ATTENDED')
      expect(afterSecondAttend.status).toBe('TRIAL_ATTENDED')
      expect(afterSecondAttend.trials.filter(trial => trial.status === 'ATTENDED')).toHaveLength(2)
      expect(afterSecondAttend.trials.find(trial => trial.id === trial1.id)?.status).toBe('ATTENDED')
      expect(afterSecondAttend.trials.find(trial => trial.id === trial2.id)?.status).toBe('ATTENDED')

      await createTrial(testDb.db, lead.id, {
        scheduledAt: T3,
        label: 'Trial 3 overlap',
        leadLineId: lineId,
      })
      const overlapping = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(T3.getTime() + 3_600_000),
        label: 'Trial 3 retry',
        leadLineId: lineId,
      })
      expectPendingInitialCount(overlapping, 1)
      expect(overlapping.trials.filter(trial => trial.status === 'SCHEDULED').length).toBeGreaterThanOrEqual(1)

      const report = await acquisitionReport(testDb.db, RANGE)
      expect(report.funnel.prospectiveMembers).toBe(1)
      expect(report.funnel.trialScheduled).toBe(1)
      expect(report.funnel.trialAttended).toBe(1)
      expect(report.trialActivity.linesWithMultipleTrials).toBe(1)
      const stored = await testDb.db.select().from(trials).where(eq(trials.leadLineId, lineId))
      expect(stored.filter(row => row.status === 'ATTENDED')).toHaveLength(2)
      expect(stored.map(row => denverYmd(row.scheduledAt.getTime())).sort()).toEqual([
        '2026-08-31',
        '2026-09-01',
        '2026-09-02',
        '2026-09-02',
      ])
    } finally {
      await testDb.close()
    }
  })

  it('recalculates only the scheduling LeadLine in a mixed household', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Parent',
        phone: '8015558602',
        programId: adult,
        source: 'WALK_IN',
      })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Kid',
        programId: kids,
        age: 8,
      })
      const parentId = household.lines[0]!.id

      const parentFirst = await createTrial(testDb.db, household.id, {
        scheduledAt: T1,
        label: 'Parent 1',
        leadLineId: parentId,
      })
      await setTrialOutcome(testDb.db, latestScheduled(parentFirst).id, { status: 'ATTENDED' })
      const childFirst = await createTrial(testDb.db, household.id, {
        scheduledAt: T1,
        label: 'Kid 1',
        leadLineId: child.id,
      })
      const afterChildAttend = await setTrialOutcome(testDb.db, latestScheduled(childFirst).id, { status: 'ATTENDED' })
      expect(lineByName(afterChildAttend, 'Parent')?.status).toBe('TRIAL_ATTENDED')
      expect(lineByName(afterChildAttend, 'Kid')?.status).toBe('TRIAL_ATTENDED')

      const afterParentSecond = await createTrial(testDb.db, household.id, {
        scheduledAt: T2,
        label: 'Parent 2',
        leadLineId: parentId,
      })
      expect(lineByName(afterParentSecond, 'Parent')?.status).toBe('TRIAL_SCHEDULED')
      expect(lineByName(afterParentSecond, 'Kid')?.status).toBe('TRIAL_ATTENDED')
      expect(afterParentSecond.trials.filter(trial => trial.status === 'ATTENDED')).toHaveLength(2)
      expectPendingInitialCount(afterParentSecond, 1)
    } finally {
      await testDb.close()
    }
  })

  it('does not let JOINED or LOST lines silently return to TRIAL_SCHEDULED', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      const joinedLead = await createLead(testDb.db, {
        firstName: 'Joined',
        phone: '8015558603',
        programId: adult,
        source: 'WALK_IN',
      })
      await convertLeadLine(testDb.db, joinedLead.lines[0]!.id, {
        membershipOfferingId: offering!.id,
        monthlyCents: 17_500,
      })
      await expect(createTrial(testDb.db, joinedLead.id, {
        scheduledAt: T2,
        label: 'After join',
        leadLineId: joinedLead.lines[0]!.id,
      })).rejects.toBeInstanceOf(DomainError)
      await expect(createTrial(testDb.db, joinedLead.id, {
        scheduledAt: T2,
        label: 'After join',
        leadLineId: joinedLead.lines[0]!.id,
      })).rejects.toThrow(/Reverse the conversion/)
      const stillJoined = await getLead(testDb.db, joinedLead.id)
      expect(stillJoined.lines[0]?.status).toBe('JOINED')
      expect(stillJoined.trials).toHaveLength(0)

      const lostLead = await createLead(testDb.db, {
        firstName: 'Lost',
        phone: '8015558604',
        programId: adult,
        source: 'WALK_IN',
      })
      const reasons = await listLostReasons(testDb.db, { activeOnly: true })
      await markLeadLineLost(testDb.db, lostLead.lines[0]!.id, { lostReasonId: reasons[0]!.id, note: 'Not a fit.' })
      await expect(createTrial(testDb.db, lostLead.id, {
        scheduledAt: T2,
        label: 'After lost',
        leadLineId: lostLead.lines[0]!.id,
      })).rejects.toThrow(/Reopen this person/)
      const stillLost = await getLead(testDb.db, lostLead.id)
      expect(stillLost.lines[0]?.status).toBe('LOST')
      expect(stillLost.trials).toHaveLength(0)

      expect(isStatusCorrection('TRIAL_ATTENDED', 'TRIAL_SCHEDULED')).toBe(true)
      const manual = await createLead(testDb.db, {
        firstName: 'Manual',
        phone: '8015558605',
        programId: adult,
        source: 'WALK_IN',
      })
      const scheduled = await createTrial(testDb.db, manual.id, {
        scheduledAt: T1,
        leadLineId: manual.lines[0]!.id,
      })
      await setTrialOutcome(testDb.db, latestScheduled(scheduled).id, { status: 'ATTENDED' })
      await expect(changeLeadLineStatus(testDb.db, manual.lines[0]!.id, {
        toStatus: 'TRIAL_SCHEDULED',
      })).rejects.toThrow(/note/)
    } finally {
      await testDb.close()
    }
  })
})
