import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { membershipOfferings, programs } from '../../server/database/schema'
import {
  listLeadSources,
  listLostReasons,
  listMembershipOfferings,
  upsertHouseholdPricingRule,
  upsertLostReason,
  upsertMembershipOffering,
} from '../../server/services/catalog'
import { DomainError } from '../../server/services/errors'
import { forecastHousehold } from '../../server/services/forecast'
import { addLeadLineToHousehold, updateLeadLine } from '../../server/services/lead-lines'
import { createLead } from '../../server/services/leads'
import { dollarsToCents } from '../../shared/utils/money'
import { openTestDatabase } from '../helpers/db'

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

async function offeringFor(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], programIdValue: number) {
  const [row] = await db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, programIdValue))
  return row!
}

describe('M8 catalog, household pricing, and forecast', () => {
  it('seeds offerings, lost reasons, sources, and adult household pricing in integer cents', async () => {
    const testDb = await openTestDatabase()
    try {
      const sources = await listLeadSources(testDb.db, { activeOnly: true })
      const reasons = await listLostReasons(testDb.db, { activeOnly: true })
      const offerings = await listMembershipOfferings(testDb.db, { activeOnly: true })
      const adult = offerings.find(row => row.program?.code === 'ADULT_BJJ')
      const kids = offerings.find(row => row.program?.code === 'KIDS_BJJ')
      expect(sources.map(row => row.code)).toContain('WALK_IN')
      expect(reasons.map(row => row.name)).toEqual(expect.arrayContaining([
        'Not interested',
        'Price',
        'Schedule',
        'Location',
        'No response',
        'Joined another gym',
        'Not ready',
        'Other',
      ]))
      expect(adult?.monthlyCents).toBe(dollarsToCents('175'))
      expect(kids?.monthlyCents).toBe(dollarsToCents('150'))
      expect(Number.isInteger(adult!.monthlyCents)).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('prices the first and additional adult household members from the structured rule', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const offering = await offeringFor(testDb.db, adult)
      const household = await createLead(testDb.db, {
        firstName: 'Alex',
        lastName: 'Adult',
        phone: '8015553100',
        programId: adult,
        source: 'WALK_IN',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering.id })
      const spouse = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Riley',
        programId: adult,
        membershipOfferingId: offering.id,
      })
      const forecast = await forecastHousehold(testDb.db, household.id)
      expect(forecast.monthlyCents).toBe(dollarsToCents('175') + dollarsToCents('155'))
      expect(forecast.enrollmentCents).toBe(0)
      const first = forecast.lines.find(row => row.leadLineId === household.lines[0]!.id)
      const second = forecast.lines.find(row => row.leadLineId === spouse.id)
      expect(first?.forecastMonthlyCents).toBe(17500)
      expect(second?.forecastMonthlyCents).toBe(15500)
      expect(first?.overridden).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('replaces only that line’s monthly amount when an override and reason are set', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const offering = await offeringFor(testDb.db, adult)
      const household = await createLead(testDb.db, {
        firstName: 'Jordan',
        phone: '8015553101',
        programId: adult,
        source: 'WALK_IN',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering.id })
      const spouse = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Casey',
        programId: adult,
        membershipOfferingId: offering.id,
        monthlyOverrideCents: dollarsToCents('100'),
        discountReason: 'Military',
      })
      const forecast = await forecastHousehold(testDb.db, household.id)
      expect(forecast.monthlyCents).toBe(17500 + 10000)
      const overridden = forecast.lines.find(row => row.leadLineId === spouse.id)
      expect(overridden?.overridden).toBe(true)
      expect(overridden?.discountReason).toBe('Military')
      expect(overridden?.forecastMonthlyCents).toBe(10000)
    } finally {
      await testDb.close()
    }
  })

  it('uses offering monthly cents when a program has no household rule', async () => {
    const testDb = await openTestDatabase()
    try {
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const offering = await offeringFor(testDb.db, kids)
      const household = await createLead(testDb.db, {
        firstName: 'Pat',
        phone: '8015553102',
        programId: kids,
        source: 'WEBSITE',
        participantFirstName: 'Sam',
        participantAge: 8,
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering.id })
      const sibling = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Quinn',
        programId: kids,
        age: 10,
        membershipOfferingId: offering.id,
      })
      const forecast = await forecastHousehold(testDb.db, household.id)
      expect(forecast.monthlyCents).toBe(15000 + 15000)
      expect(forecast.lines.find(row => row.leadLineId === sibling.id)?.forecastMonthlyCents).toBe(15000)
      await upsertMembershipOffering(testDb.db, {
        id: offering.id,
        name: offering.name,
        programId: offering.programId,
        monthlyCents: 16000,
        enrollmentCents: offering.enrollmentCents,
        active: true,
      })
      const afterPriceChange = await forecastHousehold(testDb.db, household.id)
      expect(afterPriceChange.monthlyCents).toBe(16000 + 16000)
    } finally {
      await testDb.close()
    }
  })

  it('keeps inactive offerings on assigned lines but rejects them for new conversions', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const offering = await offeringFor(testDb.db, adult)
      const household = await createLead(testDb.db, {
        firstName: 'Morgan',
        phone: '8015553103',
        programId: adult,
        source: 'PHONE',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering.id })
      await upsertMembershipOffering(testDb.db, {
        id: offering.id,
        name: offering.name,
        programId: offering.programId,
        monthlyCents: 19900,
        enrollmentCents: offering.enrollmentCents,
        active: false,
      })
      const live = await forecastHousehold(testDb.db, household.id)
      expect(live.monthlyCents).toBe(17500)
      const selectable = await listMembershipOfferings(testDb.db, { activeOnly: true })
      expect(selectable.some(row => row.id === offering.id)).toBe(false)
      await expect(addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Taylor',
        programId: adult,
        membershipOfferingId: offering.id,
      })).rejects.toBeInstanceOf(DomainError)
    } finally {
      await testDb.close()
    }
  })

  it('rejects a second household pricing rule for the same program', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      await expect(upsertHouseholdPricingRule(testDb.db, {
        programId: adult,
        firstMonthlyCents: 10000,
        additionalMonthlyCents: 9000,
      })).rejects.toBeInstanceOf(DomainError)
    } finally {
      await testDb.close()
    }
  })

  it('lets ADMIN maintain lost reasons without inventing extra taxonomy', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await upsertLostReason(testDb.db, {
        code: 'moved',
        name: 'Moved away',
        sortOrder: 85,
      })
      expect(created.code).toBe('MOVED')
      const updated = await upsertLostReason(testDb.db, {
        id: created.id,
        code: created.code,
        name: 'Moved out of area',
        active: false,
      })
      expect(updated.name).toBe('Moved out of area')
      expect(updated.active).toBe(false)
      const active = await listLostReasons(testDb.db, { activeOnly: true })
      expect(active.some(row => row.id === created.id)).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('sums enrollment cents exactly across priced lines', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const offering = await offeringFor(testDb.db, adult)
      await upsertMembershipOffering(testDb.db, {
        id: offering.id,
        name: offering.name,
        programId: offering.programId,
        monthlyCents: offering.monthlyCents,
        enrollmentCents: dollarsToCents('50'),
        active: true,
      })
      const household = await createLead(testDb.db, {
        firstName: 'Drew',
        phone: '8015553104',
        programId: adult,
        source: 'REFERRAL',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering.id })
      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Avery',
        programId: adult,
        membershipOfferingId: offering.id,
      })
      const forecast = await forecastHousehold(testDb.db, household.id)
      expect(forecast.enrollmentCents).toBe(5000 + 5000)
      expect(forecast.monthlyCents).toBe(17500 + 15500)
    } finally {
      await testDb.close()
    }
  })
})
