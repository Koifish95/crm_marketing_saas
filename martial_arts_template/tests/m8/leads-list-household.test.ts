import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { campaigns, programs } from '../../server/database/schema'
import { listLostReasons } from '../../server/services/catalog'
import { convertLeadLine, markLeadLineLost } from '../../server/services/conversion'
import { addLeadLineToHousehold } from '../../server/services/lead-lines'
import { createLead, createTrial, listLeads, setTrialOutcome } from '../../server/services/leads'
import {
  householdDisplayStatus,
  householdProgramSummary,
  householdProspectLabel,
  nextHouseholdIntro,
} from '../../shared/utils/labels'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

describe('M8 leads list household presentation', () => {
  it('summarizes programs, prospect counts, and future intros without a database', () => {
    expect(householdProspectLabel(1)).toBe('1 prospect')
    expect(householdProspectLabel(2)).toBe('2 prospects')
    expect(householdProgramSummary([{ program: { name: 'Adult BJJ' } }])).toBe('Adult BJJ')
    expect(householdProgramSummary([
      { program: { name: 'Adult BJJ' } },
      { program: { name: 'Kids BJJ' } },
    ])).toBe('Adult BJJ, Kids BJJ')
    expect(householdProgramSummary([
      { program: { name: 'Adult BJJ' } },
      { program: { name: 'Kids BJJ' } },
      { program: { name: 'Striking' } },
    ])).toBe('Mixed (3)')

    const now = 1_700_000_000_000
    const intro = nextHouseholdIntro({
      trials: [
        { status: 'SCHEDULED', scheduledAt: now - 86_400_000, leadLineId: 1 },
        { status: 'SCHEDULED', scheduledAt: now + 172_800_000, leadLineId: 2 },
        { status: 'SCHEDULED', scheduledAt: now + 86_400_000, leadLineId: 3 },
        { status: 'ATTENDED', scheduledAt: now + 3_600_000, leadLineId: 1 },
      ],
      lines: [
        { id: 1, firstName: 'Matt' },
        { id: 2, firstName: 'Jane' },
        { id: 3, firstName: 'Sam' },
      ],
    }, now)
    expect(intro?.personName).toBe('Sam')
    expect(new Date(intro!.scheduledAt).getTime()).toBe(now + 86_400_000)
    expect(nextHouseholdIntro({
      trials: [{ status: 'SCHEDULED', scheduledAt: now - 1, leadLineId: 1 }],
      lines: [{ id: 1, firstName: 'Matt' }],
    }, now)).toBeNull()
  })

  it('returns one household row with line-derived programs, search, source, and campaign', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const [campaign] = await testDb.db.insert(campaigns).values({
        name: 'Spring ads',
        slug: 'spring-ads',
        active: true,
        createdAt: new Date(utcNowMs()),
        updatedAt: new Date(utcNowMs()),
      }).returning()

      const household = await createLead(testDb.db, {
        firstName: 'Matt',
        lastName: 'Smith',
        phone: '8015557100',
        email: 'matt@example.com',
        programId: adult,
        source: 'WALK_IN',
        campaignId: campaign!.id,
      })
      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Sam',
        lastName: 'Smith',
        programId: kids,
        age: 8,
      })
      await createLead(testDb.db, {
        firstName: 'Other',
        phone: '8015557101',
        programId: adult,
        source: 'INSTAGRAM',
      })

      const rows = await listLeads(testDb.db, { search: 'Matt' })
      expect(rows).toHaveLength(1)
      expect(rows[0]?.id).toBe(household.id)
      expect(rows[0]?.lines).toHaveLength(2)
      expect(householdProspectLabel(rows[0]!.lines.length)).toBe('2 prospects')
      expect(householdProgramSummary(rows[0]!.lines, rows[0]!.program)).toBe('Adult BJJ, Kids BJJ')
      expect(rows[0]?.source).toBe('WALK_IN')
      expect(rows[0]?.campaign?.id).toBe(campaign!.id)

      const byChild = await listLeads(testDb.db, { search: 'Sam' })
      expect(byChild).toHaveLength(1)
      expect(byChild[0]?.id).toBe(household.id)

      const byKids = await listLeads(testDb.db, { programId: kids })
      expect(byKids.map(row => row.id)).toEqual([household.id])

      const byAdult = await listLeads(testDb.db, { programId: adult })
      expect(byAdult.map(row => row.firstName).sort()).toEqual(['Matt', 'Other'])

      const bySource = await listLeads(testDb.db, { source: 'WALK_IN' })
      expect(bySource.map(row => row.id)).toEqual([household.id])

      const byCampaign = await listLeads(testDb.db, { campaignId: campaign!.id })
      expect(byCampaign.map(row => row.id)).toEqual([household.id])
    } finally {
      await testDb.close()
    }
  })

  it('filters and boards households by derived household status, not leftover header status', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const reasons = await listLostReasons(testDb.db)

      const mixedClosed = await createLead(testDb.db, {
        firstName: 'ClosedMix',
        phone: '8015557200',
        programId: adult,
        source: 'WALK_IN',
      })
      const closedChild = await addLeadLineToHousehold(testDb.db, mixedClosed.id, {
        relationship: 'CHILD',
        firstName: 'ClosedKid',
        programId: kids,
        age: 9,
      })
      const closedTrial = await createTrial(testDb.db, mixedClosed.id, {
        scheduledAt: new Date(utcNowMs() + 86_400_000),
        leadLineId: mixedClosed.lines[0]!.id,
      })
      await setTrialOutcome(testDb.db, closedTrial.trials.find(trial => trial.status === 'SCHEDULED')!.id, { status: 'ATTENDED' })
      await convertLeadLine(testDb.db, mixedClosed.lines[0]!.id, { monthlyCents: 17500, enrollmentCents: 0 })
      await markLeadLineLost(testDb.db, closedChild.id, { lostReasonId: reasons[0]!.id })

      const mixedActive = await createLead(testDb.db, {
        firstName: 'ActiveMix',
        phone: '8015557201',
        programId: adult,
        source: 'WALK_IN',
      })
      await addLeadLineToHousehold(testDb.db, mixedActive.id, {
        relationship: 'SPOUSE',
        firstName: 'StillOpen',
        programId: adult,
      })
      await convertLeadLine(testDb.db, mixedActive.lines[0]!.id, { monthlyCents: 17500, enrollmentCents: 0 })

      const allLost = await createLead(testDb.db, {
        firstName: 'AllLost',
        phone: '8015557202',
        programId: adult,
        source: 'WALK_IN',
      })
      const lostSibling = await addLeadLineToHousehold(testDb.db, allLost.id, {
        relationship: 'CHILD',
        firstName: 'LostKid',
        programId: kids,
        age: 7,
      })
      await markLeadLineLost(testDb.db, allLost.lines[0]!.id, { lostReasonId: reasons[0]!.id })
      await markLeadLineLost(testDb.db, lostSibling.id, { lostReasonId: reasons[0]!.id })

      const allJoined = await createLead(testDb.db, {
        firstName: 'AllJoined',
        phone: '8015557203',
        programId: adult,
        source: 'WALK_IN',
      })
      const joinedSibling = await addLeadLineToHousehold(testDb.db, allJoined.id, {
        relationship: 'SPOUSE',
        firstName: 'JoinedPartner',
        programId: adult,
      })
      await convertLeadLine(testDb.db, allJoined.lines[0]!.id, { monthlyCents: 17500, enrollmentCents: 0 })
      await convertLeadLine(testDb.db, joinedSibling.id, { monthlyCents: 15000, enrollmentCents: 0 })

      const closedRow = (await listLeads(testDb.db, { search: 'ClosedMix' }))[0]!
      expect(closedRow.lines).toHaveLength(2)
      expect(closedRow.status).toBe('TRIAL_ATTENDED')
      expect(householdDisplayStatus(closedRow)).toMatchObject({
        key: 'CLOSED_MIXED',
        label: 'Closed · mixed outcomes',
      })
      expect((await listLeads(testDb.db, { status: 'CLOSED_MIXED' })).map(row => row.id)).toEqual([closedRow.id])
      expect((await listLeads(testDb.db, { status: 'TRIAL_ATTENDED' })).map(row => row.id)).not.toContain(closedRow.id)
      expect((await listLeads(testDb.db, { status: 'JOINED' })).map(row => row.id)).not.toContain(closedRow.id)

      const activeRow = (await listLeads(testDb.db, { search: 'ActiveMix' }))[0]!
      expect(householdDisplayStatus(activeRow).label).toBe('Active · mixed outcomes')
      expect((await listLeads(testDb.db, { status: 'ACTIVE_MIXED' })).map(row => row.id)).toEqual([activeRow.id])

      const lostRow = (await listLeads(testDb.db, { search: 'AllLost' }))[0]!
      expect(householdDisplayStatus(lostRow).label).toBe('Lost')
      expect((await listLeads(testDb.db, { status: 'LOST' })).map(row => row.id)).toEqual([lostRow.id])

      const joinedRow = (await listLeads(testDb.db, { search: 'AllJoined' }))[0]!
      expect(householdDisplayStatus(joinedRow).label).toBe('Joined')
      expect((await listLeads(testDb.db, { status: 'JOINED' })).map(row => row.id)).toEqual([joinedRow.id])

      const board = await listLeads(testDb.db)
      const columns = Object.fromEntries(board.map(row => [row.firstName, householdDisplayStatus(row).key]))
      expect(columns.ClosedMix).toBe('CLOSED_MIXED')
      expect(columns.ActiveMix).toBe('ACTIVE_MIXED')
      expect(columns.AllLost).toBe('LOST')
      expect(columns.AllJoined).toBe('JOINED')
      expect(columns.ClosedMix).not.toBe('TRIAL_ATTENDED')
    } finally {
      await testDb.close()
    }
  })

  it('uses the earliest future scheduled intro across lines and ignores past trials', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const now = utcNowMs()
      const household = await createLead(testDb.db, {
        firstName: 'Calendar',
        phone: '8015557300',
        programId: adult,
        source: 'WALK_IN',
      })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'FutureKid',
        programId: kids,
        age: 8,
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now - 86_400_000),
        label: 'Past dad intro',
        leadLineId: household.lines[0]!.id,
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 172_800_000),
        label: 'Later kid intro',
        leadLineId: child.id,
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 86_400_000),
        label: 'Sooner kid intro',
        leadLineId: child.id,
      })

      const row = (await listLeads(testDb.db, { search: 'Calendar' }))[0]!
      expect(row.nextTrial).toBeTruthy()
      expect(row.nextTrial?.personName).toBe('FutureKid')
      expect(new Date(row.nextTrial!.scheduledAt).getTime()).toBe(now + 86_400_000)

      const pastOnly = await createLead(testDb.db, {
        firstName: 'PastOnly',
        phone: '8015557301',
        programId: adult,
        source: 'WALK_IN',
      })
      await createTrial(testDb.db, pastOnly.id, {
        scheduledAt: new Date(now - 3_600_000),
        label: 'Already happened',
        leadLineId: pastOnly.lines[0]!.id,
      })
      const pastRow = (await listLeads(testDb.db, { search: 'PastOnly' }))[0]!
      expect(pastRow.nextTrial).toBeNull()
    } finally {
      await testDb.close()
    }
  })
})
