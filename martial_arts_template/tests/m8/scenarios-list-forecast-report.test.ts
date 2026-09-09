import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { campaigns, conversions } from '../../server/database/schema'
import { upsertMembershipOffering } from '../../server/services/catalog'
import { forecastHousehold } from '../../server/services/forecast'
import { addLeadLineToHousehold, updateLeadLine } from '../../server/services/lead-lines'
import { createLead, createTrial, getLead, listLeads, setTrialOutcome } from '../../server/services/leads'
import { bookPublicHousehold } from '../../server/services/public-trial'
import { acquisitionReport } from '../../server/services/reports'
import {
  householdDisplayStatus,
  householdProgramSummary,
  householdProspectLabel,
  nextHouseholdIntro,
} from '../../shared/utils/labels'
import { dollarsToCents } from '../../shared/utils/money'
import { denverYmd, utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'
import {
  SCENARIO_NOW,
  adultSlot,
  convertHouseholdLine,
  createParentChildHousehold,
  expectHouseholdStatus,
  expectPendingInitialCount,
  kidsSlot,
  lineByRelationship,
  markLineLost,
  nextPhone,
  offeringFor,
  programId,
  scheduledTrials,
  scheduleValidTrialForLine,
} from './helpers/scenarios'

describe('M8 scenarios H — Leads list / Pipeline', () => {
  it('lists one household row with prospect count, programs, search, filters, and next intro', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const [campaign] = await testDb.db.insert(campaigns).values({
        name: 'Scenario ads',
        slug: 'scenario-ads',
        active: true,
        createdAt: new Date(utcNowMs()),
        updatedAt: new Date(utcNowMs()),
      }).returning()
      const household = await createLead(testDb.db, {
        firstName: 'ListDad',
        lastName: 'Smith',
        phone: nextPhone(),
        programId: adult,
        source: 'WALK_IN',
        campaignId: campaign!.id,
      })
      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'ListKid',
        programId: kids,
        age: 8,
      })
      const now = utcNowMs()
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now - 86_400_000),
        leadLineId: household.lines[0]!.id,
        label: 'Past',
      })
      const child = (await getLead(testDb.db, household.id)).lines.find(line => line.firstName === 'ListKid')!
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 86_400_000),
        leadLineId: child.id,
        label: 'Future',
      })

      const rows = await listLeads(testDb.db, { search: 'ListDad' })
      expect(rows).toHaveLength(1)
      expect(householdProspectLabel(rows[0]!.lines.length)).toBe('2 prospects')
      expect(householdProgramSummary(rows[0]!.lines)).toBe('Adult BJJ, Kids BJJ')
      expect(householdDisplayStatus(rows[0]!).key).toBe(householdDisplayStatus(await getLead(testDb.db, household.id)).key)
      expect(rows[0]?.source).toBe('WALK_IN')
      expect(rows[0]?.campaign?.id).toBe(campaign!.id)
      expect((await listLeads(testDb.db, { search: 'ListKid' }))[0]?.id).toBe(household.id)
      expect((await listLeads(testDb.db, { programId: kids })).map(row => row.id)).toContain(household.id)
      expect((await listLeads(testDb.db, { source: 'WALK_IN' })).map(row => row.id)).toContain(household.id)
      expect((await listLeads(testDb.db, { campaignId: campaign!.id })).map(row => row.id)).toEqual([household.id])
      expect(rows[0]?.nextTrial?.personName).toBe('ListKid')
      expect(nextHouseholdIntro(rows[0]!, now)?.personName).toBe('ListKid')
    } finally {
      await testDb.close()
    }
  })
})

describe('M8 scenarios I — pricing / forecast / conversion snapshot', () => {
  it('uses configured household pricing, line override, and frozen conversion snapshots', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const offering = await offeringFor(testDb.db, adult)
      const household = await createLead(testDb.db, {
        firstName: 'PriceDad',
        phone: nextPhone(),
        programId: adult,
        source: 'WALK_IN',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering.id })
      const single = await forecastHousehold(testDb.db, household.id)
      expect(single.monthlyCents).toBe(dollarsToCents('175'))

      const spouse = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'PriceSpouse',
        programId: adult,
        membershipOfferingId: offering.id,
      })
      const family = await forecastHousehold(testDb.db, household.id)
      expect(family.monthlyCents).toBe(dollarsToCents('175') + dollarsToCents('155'))

      await updateLeadLine(testDb.db, spouse.id, {
        monthlyOverrideCents: dollarsToCents('100'),
        discountReason: 'Military',
      })
      const overridden = await forecastHousehold(testDb.db, household.id)
      expect(overridden.monthlyCents).toBe(17500 + 10000)
      expect(overridden.lines.find(row => row.leadLineId === spouse.id)?.discountReason).toBe('Military')

      const conversion = await convertHouseholdLine(testDb.db, household.lines[0]!)
      await upsertMembershipOffering(testDb.db, {
        id: offering.id,
        name: offering.name,
        programId: offering.programId,
        monthlyCents: 19900,
        enrollmentCents: offering.enrollmentCents,
        active: true,
      })
      const [stored] = await testDb.db.select().from(conversions).where(eq(conversions.id, conversion.id))
      expect(stored?.monthlyCents).toBe(17500)

      await markLineLost(testDb.db, spouse.id)
      const mixed = await forecastHousehold(testDb.db, household.id)
      const live = await getLead(testDb.db, household.id)
      expect(activeJoined(live)).toBe(1)
      expect(mixed.monthlyCents).toBe(0)
      expect(stored?.monthlyCents).toBe(17500)
    } finally {
      await testDb.close()
    }
  })
})

function activeJoined(lead: Awaited<ReturnType<typeof getLead>>) {
  return (lead.lines ?? []).filter(line => line.status === 'JOINED').length
}

describe('M8 scenarios J — public vs staff consistency', () => {
  it('public parent+child booking and staff-created equivalent share domain state', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await adultSlot(testDb.db)
      const childSlot = await kidsSlot(testDb.db, 8)
      const publicPhone = nextPhone()
      const publicBooked = await bookPublicHousehold(testDb.db, {
        firstName: 'PubDad',
        lastName: 'House',
        phone: publicPhone,
        utmSource: 'meta',
        members: [{
          relationship: 'SELF',
          firstName: 'PubDad',
          lastName: 'House',
          programCode: 'ADULT_BJJ',
          slotId: adult.id,
        }, {
          relationship: 'CHILD',
          firstName: 'PubKid',
          age: 8,
          programCode: 'KIDS_BJJ',
          slotId: childSlot.id,
        }],
      }, { nowMs: SCENARIO_NOW })

      const staff = await createParentChildHousehold(testDb.db, {
        parentFirstName: 'StaffDad',
        childFirstName: 'StaffKid',
      })
      const staffParent = lineByRelationship(staff, 'SELF')!
      const staffChild = lineByRelationship(staff, 'CHILD')!
      await scheduleValidTrialForLine(testDb.db, staff.id, staffParent.id, 'ADULT_BJJ', { slotId: adult.id })
      await scheduleValidTrialForLine(testDb.db, staff.id, staffChild.id, 'KIDS_BJJ', { age: 8, slotId: childSlot.id })
      const staffLead = await getLead(testDb.db, staff.id)

      expect(publicBooked.lead.lines).toHaveLength(2)
      expect(staffLead.lines).toHaveLength(2)
      expect(publicBooked.lead.lines.filter(line => line.relationship === 'SELF')).toHaveLength(1)
      expect(staffLead.lines.filter(line => line.relationship === 'SELF')).toHaveLength(1)
      expect(scheduledTrials(lineByRelationship(publicBooked.lead, 'SELF'))).toHaveLength(1)
      expect(scheduledTrials(lineByRelationship(staffLead, 'SELF'))).toHaveLength(1)
      expectPendingInitialCount(publicBooked.lead, 1)
      expectPendingInitialCount(staffLead, 1)
      expectHouseholdStatus(publicBooked.lead, 'ACTIVE')
      expectHouseholdStatus(staffLead, 'ACTIVE')
      expect(publicBooked.lead.utmSource).toBe('meta')
      expect(staffLead.utmSource ?? null).toBeNull()
    } finally {
      await testDb.close()
    }
  })
})

describe('M8 scenarios L — reporting regression from scenario fixtures', () => {
  it('counts households, unique people, and conversion snapshot MRR without double-counting reschedules', async () => {
    const testDb = await openTestDatabase()
    try {
      const publicBooked = await bookPublicHousehold(testDb.db, {
        firstName: 'RepDad',
        lastName: 'Rep',
        phone: nextPhone(),
        members: [{
          relationship: 'SELF',
          firstName: 'RepDad',
          programCode: 'ADULT_BJJ',
          slotId: (await adultSlot(testDb.db)).id,
        }, {
          relationship: 'CHILD',
          firstName: 'RepKid',
          age: 8,
          programCode: 'KIDS_BJJ',
          slotId: (await kidsSlot(testDb.db, 8)).id,
        }],
      }, { nowMs: SCENARIO_NOW })
      const parent = lineByRelationship(publicBooked.lead, 'SELF')!
      await setTrialOutcome(testDb.db, scheduledTrials(parent)[0]!.id, { status: 'CANCELLED' })
      await scheduleValidTrialForLine(testDb.db, publicBooked.lead.id, parent.id, 'ADULT_BJJ', {
        slotId: (await adultSlot(testDb.db, SCENARIO_NOW, '2026-09-01')).id,
      })
      await setTrialOutcome(testDb.db, scheduledTrials((await getLead(testDb.db, publicBooked.lead.id)).lines.find(line => line.id === parent.id)!)[0]!.id, { status: 'ATTENDED' })
      await convertHouseholdLine(testDb.db, parent)
      await markLineLost(testDb.db, lineByRelationship(await getLead(testDb.db, publicBooked.lead.id), 'CHILD')!.id)

      const report = await acquisitionReport(testDb.db, {
        fromYmd: denverYmd(SCENARIO_NOW),
        toYmd: denverYmd(Math.max(SCENARIO_NOW + 8 * 86_400_000, utcNowMs())),
      })
      expect(report.households).toBe(1)
      expect(report.prospectiveMembers).toBe(2)
      expect(report.funnel.trialScheduled).toBe(2)
      expect(report.funnel.trialAttended).toBe(1)
      expect(report.funnel.converted).toBe(1)
      expect(report.conversions.newMrrCents).toBe(17500)
      expect(report.groupings.byProgram.some(row => row.prospectiveMembers >= 1)).toBe(true)
      expect(report.groupings.bySource.find(row => row.key === 'WEBSITE' || row.key === 'WALK_IN' || row.key === 'INSTAGRAM')).toBeTruthy()
    } finally {
      await testDb.close()
    }
  })
})
