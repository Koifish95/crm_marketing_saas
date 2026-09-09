import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  conversions,
  leadLineLostOutcomes,
  leadLines,
  leads,
  membershipOfferings,
  programs,
} from '../../server/database/schema'
import { listLostReasons } from '../../server/services/catalog'
import { createCampaign } from '../../server/services/campaigns'
import { convertLeadLine, markLeadLineLost } from '../../server/services/conversion'
import { addLeadLineToHousehold, updateLeadLine } from '../../server/services/lead-lines'
import { createLead, createTrial, setTrialOutcome } from '../../server/services/leads'
import { acquisitionReport, reportCsv } from '../../server/services/reports'
import { denverYmd } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

const IN_RANGE = new Date('2026-08-31T18:00:00.000Z')
const BEFORE = new Date('2026-08-31T05:00:00.000Z')
const AFTER = new Date('2026-09-01T06:00:00.000Z')
const RANGE = { fromYmd: '2026-08-31', toYmd: '2026-08-31' }

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

async function offeringFor(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], programIdValue: number) {
  const [row] = await db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, programIdValue))
  return row!
}

async function latestScheduled(created: { trials: Array<{ id: number, status: string }> }) {
  const trial = [...created.trials].filter(row => row.status === 'SCHEDULED').sort((a, b) => b.id - a.id)[0]
  if (!trial) {
    throw new Error('Expected a scheduled trial')
  }
  return trial
}

async function stampHousehold(
  db: Awaited<ReturnType<typeof openTestDatabase>>['db'],
  leadId: number,
  at: Date,
) {
  await db.update(leads).set({ createdAt: at, updatedAt: at }).where(eq(leads.id, leadId))
  await db.update(leadLines).set({ createdAt: at, updatedAt: at }).where(eq(leadLines.leadId, leadId))
}

describe('M8 reporting', () => {
  it('counts households from headers and funnel people from unique lines', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const offering = await offeringFor(testDb.db, adult)
      const kidsOffering = await offeringFor(testDb.db, kids)
      const campaign = await createCampaign(testDb.db, { name: 'Back to School Trial' })
      const reasons = await listLostReasons(testDb.db, { activeOnly: true })

      const walkIn = await createLead(testDb.db, {
        firstName: 'Alex',
        phone: '8015556100',
        programId: adult,
        source: 'WALK_IN',
      })
      await addLeadLineToHousehold(testDb.db, walkIn.id, {
        relationship: 'SPOUSE',
        firstName: 'Riley',
        programId: adult,
      })
      await stampHousehold(testDb.db, walkIn.id, IN_RANGE)

      const meta = await createLead(testDb.db, {
        firstName: 'Jordan',
        phone: '8015556101',
        programId: kids,
        source: 'INSTAGRAM',
        campaignId: campaign.id,
        participantFirstName: 'Sam',
        participantAge: 8,
      })
      await stampHousehold(testDb.db, meta.id, IN_RANGE)

      const outside = await createLead(testDb.db, {
        firstName: 'Outside',
        phone: '8015556102',
        programId: adult,
        source: 'WALK_IN',
      })
      await stampHousehold(testDb.db, outside.id, BEFORE)

      const after = await createLead(testDb.db, {
        firstName: 'Later',
        phone: '8015556103',
        programId: adult,
        source: 'WALK_IN',
      })
      await stampHousehold(testDb.db, after.id, AFTER)

      const [walkInLead] = await testDb.db.select().from(leads).where(eq(leads.id, walkIn.id))
      const walkInLines = await testDb.db.select().from(leadLines).where(eq(leadLines.leadId, walkIn.id))
      const alex = walkInLines.find(line => line.firstName === 'Alex')!
      const riley = walkInLines.find(line => line.firstName === 'Riley')!
      const sam = (await testDb.db.select().from(leadLines).where(eq(leadLines.leadId, meta.id)))[0]!

      const firstTrial = await latestScheduled(await createTrial(testDb.db, walkIn.id, {
        scheduledAt: IN_RANGE,
        leadLineId: alex.id,
      }))
      await setTrialOutcome(testDb.db, firstTrial.id, { status: 'CANCELLED' })
      const secondTrial = await latestScheduled(await createTrial(testDb.db, walkIn.id, {
        scheduledAt: IN_RANGE,
        leadLineId: alex.id,
      }))
      await setTrialOutcome(testDb.db, secondTrial.id, { status: 'NO_SHOW' })
      const thirdTrial = await latestScheduled(await createTrial(testDb.db, walkIn.id, {
        scheduledAt: IN_RANGE,
        leadLineId: alex.id,
      }))
      await setTrialOutcome(testDb.db, thirdTrial.id, { status: 'ATTENDED' })

      const rileyTrial = await latestScheduled(await createTrial(testDb.db, walkIn.id, {
        scheduledAt: IN_RANGE,
        leadLineId: riley.id,
      }))
      await setTrialOutcome(testDb.db, rileyTrial.id, { status: 'ATTENDED' })

      await updateLeadLine(testDb.db, alex.id, { membershipOfferingId: offering.id })
      await updateLeadLine(testDb.db, riley.id, {
        membershipOfferingId: offering.id,
        monthlyOverrideCents: 15500,
        discountReason: 'Household second member',
      })
      await updateLeadLine(testDb.db, sam.id, { membershipOfferingId: kidsOffering.id })

      await convertLeadLine(testDb.db, alex.id, { joinedAt: IN_RANGE })
      await convertLeadLine(testDb.db, riley.id, { joinedAt: IN_RANGE })
      await markLeadLineLost(testDb.db, sam.id, { lostReasonId: reasons[0]!.id })
      await testDb.db.update(conversions).set({ joinedAt: IN_RANGE }).where(eq(conversions.leadLineId, alex.id))
      await testDb.db.update(conversions).set({ joinedAt: IN_RANGE }).where(eq(conversions.leadLineId, riley.id))
      await testDb.db.update(leadLineLostOutcomes).set({ createdAt: IN_RANGE }).where(eq(leadLineLostOutcomes.leadLineId, sam.id))

      expect(denverYmd(IN_RANGE.getTime())).toBe('2026-08-31')
      expect(denverYmd(BEFORE.getTime())).toBe('2026-08-30')
      expect(denverYmd(AFTER.getTime())).toBe('2026-09-01')
      expect(walkInLead).toBeTruthy()

      const report = await acquisitionReport(testDb.db, RANGE)
      expect(report.households).toBe(2)
      expect(report.prospectiveMembers).toBe(3)
      expect(report.funnel.trialScheduled).toBe(2)
      expect(report.funnel.trialAttended).toBe(2)
      expect(report.funnel.converted).toBe(2)
      expect(report.funnel.lineToTrialRate).toBe(Math.round((2 / 3) * 1000) / 1000)
      expect(report.funnel.scheduledToAttendedRate).toBe(1)
      expect(report.funnel.attendedToJoinedRate).toBe(1)
      expect(report.funnel.lineToJoinedRate).toBe(Math.round((2 / 3) * 1000) / 1000)
      expect(report.trialActivity.linesWithMultipleTrials).toBe(1)
      expect(report.trialActivity.noShowCount).toBe(1)
      expect(report.trialActivity.cancelledCount).toBe(1)
      expect(report.conversions.count).toBe(2)
      expect(report.conversions.newMrrCents).toBe(17500 + 15500)
      expect(report.conversions.overriddenCount).toBe(1)
      expect(report.conversions.overrideMrrCents).toBe(15500)
      expect(report.lost.count).toBe(1)
      expect(report.lost.byReason[0]?.count).toBe(1)

      const walkInGroup = report.groupings.bySource.find(row => row.key === 'WALK_IN')
      const instagram = report.groupings.bySource.find(row => row.key === 'INSTAGRAM')
      expect(walkInGroup?.households).toBe(1)
      expect(walkInGroup?.prospectiveMembers).toBe(2)
      expect(walkInGroup?.converted).toBe(2)
      expect(instagram?.households).toBe(1)
      expect(instagram?.prospectiveMembers).toBe(1)

      const adultGroup = report.groupings.byProgram.find(row => row.programId === adult)
      const kidsGroup = report.groupings.byProgram.find(row => row.programId === kids)
      expect(adultGroup?.prospectiveMembers).toBe(2)
      expect(kidsGroup?.prospectiveMembers).toBe(1)

      const campaignGroup = report.groupings.byCampaign.find(row => row.campaignId === campaign.id)
      const unattributed = report.groupings.byCampaign.find(row => row.key === 'unattributed')
      expect(campaignGroup?.households).toBe(1)
      expect(unattributed?.households).toBe(1)

      expect(report.groupings.byOffering).toHaveLength(1)
      expect(Number(report.groupings.byOffering[0]?.conversions)).toBe(2)
      expect(Number(report.groupings.byOffering[0]?.newMrrCents)).toBe(17500 + 15500)

      const filtered = await acquisitionReport(testDb.db, { ...RANGE, source: 'WALK_IN' })
      expect(filtered.households).toBe(1)
      expect(filtered.prospectiveMembers).toBe(2)

      const csv = await reportCsv(testDb.db, RANGE, 'conversions', true)
      expect(csv).toContain('monthlyCents')
      expect(csv).toContain('15500')
      expect(csv).toContain('Alex')
      const peopleCsv = await reportCsv(testDb.db, RANGE, 'leads', true)
      expect(peopleCsv.split('\n').length - 1).toBe(3)
      const campaignCsv = await reportCsv(testDb.db, RANGE, 'campaigns', false)
      expect(campaignCsv).not.toContain('newMrrCents')
      expect(campaignCsv).toContain('unattributed')
    } finally {
      await testDb.close()
    }
  })

  it('does not double-count a rescheduled person in the funnel', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const lead = await createLead(testDb.db, {
        firstName: 'Pat',
        phone: '8015556199',
        programId: adult,
        source: 'PHONE',
      })
      await stampHousehold(testDb.db, lead.id, IN_RANGE)
      const [line] = await testDb.db.select().from(leadLines).where(eq(leadLines.leadId, lead.id))
      const first = await latestScheduled(await createTrial(testDb.db, lead.id, { scheduledAt: IN_RANGE, leadLineId: line!.id }))
      await setTrialOutcome(testDb.db, first.id, { status: 'CANCELLED' })
      await createTrial(testDb.db, lead.id, { scheduledAt: IN_RANGE, leadLineId: line!.id })
      const report = await acquisitionReport(testDb.db, RANGE)
      expect(report.prospectiveMembers).toBe(1)
      expect(report.funnel.trialScheduled).toBe(1)
      expect(report.trialActivity.linesWithMultipleTrials).toBe(1)
      expect(report.trialActivity.cancelledCount).toBe(1)
    } finally {
      await testDb.close()
    }
  })
})
