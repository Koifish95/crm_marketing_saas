import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import { followUpTasks, leadLines, leads, publicBookingSubmissions, trials } from '../../server/database/schema'
import { DomainError } from '../../server/services/errors'
import { reverseConversion } from '../../server/services/conversion'
import {
  createTrial,
  getLead,
  scheduleTrialFromSlot,
  setTrialOutcome,
} from '../../server/services/leads'
import * as leadService from '../../server/services/leads'
import { bookPublicHousehold } from '../../server/services/public-trial'
import { acquisitionReport } from '../../server/services/reports'
import { nextHouseholdIntro } from '../../shared/utils/labels'
import { denverYmd, utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'
import {
  SCENARIO_NOW,
  activeConversions,
  adminActor,
  adultNoGiSlot,
  adultSlot,
  convertHouseholdLine,
  createSingleAdultHousehold,
  createTwoChildHousehold,
  expectHouseholdStatus,
  expectPendingInitialCount,
  householdClosed,
  kidsSlot,
  lineByName,
  markLineLost,
  nextPhone,
  scheduledTrials,
  scheduleValidTrialForLine,
  trialsFor,
} from './helpers/scenarios'

describe('M8 scenarios D — multiple children', () => {
  it('guardian plus two children schedule together with independent outcomes', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const household = await createTwoChildHousehold(testDb.db)
      expect(household.firstName).toBe('Jordan')
      expect(household.lines).toHaveLength(2)
      expect(household.lines.every(line => line.relationship === 'CHILD')).toBe(true)
      expect(household.lines.some(line => line.firstName === 'Jordan')).toBe(false)

      const riley = lineByName(household, 'Riley')!
      const quinn = lineByName(household, 'Quinn')!
      const rileySlot = await kidsSlot(testDb.db, 8)
      const quinnSlot = await kidsSlot(testDb.db, 10)
      await scheduleValidTrialForLine(testDb.db, household.id, riley.id, 'KIDS_BJJ', { age: 8, slotId: rileySlot.id })
      await scheduleValidTrialForLine(testDb.db, household.id, quinn.id, 'KIDS_BJJ', { age: 10, slotId: quinnSlot.id })
      const booked = await getLead(testDb.db, household.id)
      expect(scheduledTrials(lineByName(booked, 'Riley'))).toHaveLength(1)
      expect(scheduledTrials(lineByName(booked, 'Quinn'))).toHaveLength(1)
      expectPendingInitialCount(booked, 1)

      await setTrialOutcome(testDb.db, scheduledTrials(lineByName(booked, 'Riley'))[0]!.id, { status: 'NO_SHOW' })
      await setTrialOutcome(testDb.db, scheduledTrials(lineByName(booked, 'Quinn'))[0]!.id, { status: 'ATTENDED' })
      const mixedTrials = await getLead(testDb.db, household.id)
      expect(trialsFor(lineByName(mixedTrials, 'Riley'))[0]?.status).toBe('NO_SHOW')
      expect(trialsFor(lineByName(mixedTrials, 'Quinn'))[0]?.status).toBe('ATTENDED')
      expect(householdClosed(mixedTrials)).toBe(false)

      await convertHouseholdLine(testDb.db, quinn, actor)
      const oneJoined = await getLead(testDb.db, household.id)
      expect(lineByName(oneJoined, 'Quinn')?.status).toBe('JOINED')
      expect(lineByName(oneJoined, 'Riley')?.status).toBe('NO_SHOW')
      expect(oneJoined.closedAt).toBeNull()
      expectHouseholdStatus(oneJoined, 'ACTIVE_MIXED', 'Active · mixed outcomes')

      const range = { fromYmd: denverYmd(SCENARIO_NOW), toYmd: denverYmd(SCENARIO_NOW + 8 * 86_400_000) }
      const report = await acquisitionReport(testDb.db, range)
      expect(report.prospectiveMembers).toBe(2)
      expect(report.funnel.converted).toBe(1)
      expect(report.funnel.trialAttended).toBe(1)

      await markLineLost(testDb.db, riley.id, actor)
      await reverseConversion(testDb.db, activeConversions(lineByName(await getLead(testDb.db, household.id), 'Quinn'))[0]!.id, { note: 'Both lost path.' }, actor)
      await markLineLost(testDb.db, quinn.id, actor)
      const allLost = await getLead(testDb.db, household.id)
      expect(allLost.lines.every(line => line.status === 'LOST')).toBe(true)
      expect(allLost.closedAt).toBeTruthy()
      expectHouseholdStatus(allLost, 'LOST', 'Lost')
    } finally {
      await testDb.close()
    }
  })
})

describe('M8 scenarios E — Trial edge cases', () => {
  it('E1 no-show then reschedule then attend then convert counts the person once', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const created = await createSingleAdultHousehold(testDb.db, { firstName: 'Casey' })
      const lineId = created.lines[0]!.id
      const first = await scheduleValidTrialForLine(testDb.db, created.id, lineId, 'ADULT_BJJ')
      const noShow = await setTrialOutcome(testDb.db, scheduledTrials(first.lines[0])[0]!.id, { status: 'NO_SHOW' })
      expect(trialsFor(noShow.lines[0])[0]?.status).toBe('NO_SHOW')
      expectPendingInitialCount(noShow, 0)

      const second = await scheduleValidTrialForLine(testDb.db, created.id, lineId, 'ADULT_BJJ', {
        slotId: (await adultNoGiSlot(testDb.db)).id,
      })
      expect(trialsFor(second.lines[0]).filter(trial => trial.status === 'NO_SHOW')).toHaveLength(1)
      expect(scheduledTrials(second.lines[0])).toHaveLength(1)
      expectPendingInitialCount(second, 1)
      await setTrialOutcome(testDb.db, scheduledTrials(second.lines[0])[0]!.id, { status: 'ATTENDED' })
      await convertHouseholdLine(testDb.db, second.lines[0]!, actor)
      const done = await getLead(testDb.db, created.id)
      expect(activeConversions(done.lines[0])).toHaveLength(1)
      expect(trialsFor(done.lines[0])).toHaveLength(2)
      const report = await acquisitionReport(testDb.db, {
        fromYmd: denverYmd(SCENARIO_NOW),
        toYmd: denverYmd(Math.max(SCENARIO_NOW + 8 * 86_400_000, utcNowMs())),
      })
      expect(report.prospectiveMembers).toBe(1)
      expect(report.funnel.trialScheduled).toBe(1)
      expect(report.funnel.trialAttended).toBe(1)
      expect(report.funnel.converted).toBe(1)
    } finally {
      await testDb.close()
    }
  })

  it('E2 cancel then a new Trial preserves history and reconciles follow-up', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createSingleAdultHousehold(testDb.db, { firstName: 'Drew' })
      const first = await scheduleValidTrialForLine(testDb.db, created.id, created.lines[0]!.id, 'ADULT_BJJ')
      const cancelled = await setTrialOutcome(testDb.db, scheduledTrials(first.lines[0])[0]!.id, { status: 'CANCELLED' })
      expect(trialsFor(cancelled.lines[0])[0]?.status).toBe('CANCELLED')
      expectPendingInitialCount(cancelled, 0)
      const again = await scheduleValidTrialForLine(testDb.db, created.id, created.lines[0]!.id, 'ADULT_BJJ', {
        slotId: (await adultNoGiSlot(testDb.db)).id,
      })
      expect(trialsFor(again.lines[0])).toHaveLength(2)
      expect(scheduledTrials(again.lines[0])).toHaveLength(1)
      expectPendingInitialCount(again, 1)
    } finally {
      await testDb.close()
    }
  })

  it('E3 multiple historical Trials keep next-intro on the earliest future SCHEDULED row', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createSingleAdultHousehold(testDb.db, { firstName: 'Morgan' })
      const lineId = created.lines[0]!.id
      const now = SCENARIO_NOW
      await createTrial(testDb.db, created.id, {
        scheduledAt: new Date(now - 86_400_000),
        label: 'Past',
        leadLineId: lineId,
      }, undefined, { nowMs: now })
      await createTrial(testDb.db, created.id, {
        scheduledAt: new Date(now + 172_800_000),
        label: 'Later',
        leadLineId: lineId,
      }, undefined, { nowMs: now })
      await createTrial(testDb.db, created.id, {
        scheduledAt: new Date(now + 86_400_000),
        label: 'Sooner',
        leadLineId: lineId,
      }, undefined, { nowMs: now })
      const lead = await getLead(testDb.db, created.id)
      expect(trialsFor(lead.lines[0])).toHaveLength(3)
      const intro = nextHouseholdIntro(lead, now)
      expect(intro).toBeTruthy()
      expect(new Date(intro!.scheduledAt).getTime()).toBe(now + 86_400_000)
      const report = await acquisitionReport(testDb.db, {
        fromYmd: denverYmd(SCENARIO_NOW),
        toYmd: denverYmd(Math.max(SCENARIO_NOW + 8 * 86_400_000, utcNowMs())),
      })
      expect(report.prospectiveMembers).toBe(1)
      expect(report.funnel.trialScheduled).toBe(1)
    } finally {
      await testDb.close()
    }
  })

  it('E4 invalid staff slot is rejected with no Trial or Follow-Up', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createSingleAdultHousehold(testDb.db, { firstName: 'Invalid' })
      await expect(scheduleTrialFromSlot(testDb.db, created.id, {
        slotId: 'not-a-real-slot',
        leadLineId: created.lines[0]!.id,
      }, undefined, { nowMs: SCENARIO_NOW })).rejects.toBeInstanceOf(DomainError)
      const lead = await getLead(testDb.db, created.id)
      expect(lead.trials).toHaveLength(0)
      expectPendingInitialCount(lead, 0)
      expect(lead.lines[0]?.status).toBe('NEW')
    } finally {
      await testDb.close()
    }
  })

  it('E5 household booking rolls back Header, Lines, Trials, and Follow-Up', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await adultSlot(testDb.db)
      const child = await kidsSlot(testDb.db, 9)
      const original = leadService.createTrial.bind(leadService)
      let calls = 0
      const spy = vi.spyOn(leadService, 'createTrial').mockImplementation(async (...args) => {
        calls += 1
        if (calls === 2) {
          throw new DomainError('forced booking failure')
        }
        return original(...args)
      })
      const phone = nextPhone()
      await expect(bookPublicHousehold(testDb.db, {
        firstName: 'Taylor',
        lastName: 'Fail',
        phone,
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
          slotId: child.id,
        }],
      }, { nowMs: SCENARIO_NOW })).rejects.toBeInstanceOf(DomainError)
      expect(await testDb.db.select().from(leads).where(eq(leads.phone, phone))).toHaveLength(0)
      expect((await testDb.db.select().from(leadLines)).some(line => line.firstName === 'Taylor')).toBe(false)
      expect((await testDb.db.select().from(trials)).some(trial => trial.notes === 'Booked from public /trial.')).toBe(false)
      expect((await testDb.db.select().from(followUpTasks))).toHaveLength(0)
      expect(await testDb.db.select().from(publicBookingSubmissions)).toHaveLength(0)
      spy.mockRestore()
    } finally {
      await testDb.close()
    }
  })
})
