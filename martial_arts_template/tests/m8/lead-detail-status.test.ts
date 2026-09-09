import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { membershipOfferings, programs } from '../../server/database/schema'
import { listLostReasons } from '../../server/services/catalog'
import { convertLeadLine, markLeadLineLost } from '../../server/services/conversion'
import { addLeadLineToHousehold, changeLeadLineStatus, householdIsClosed, updateLeadLine } from '../../server/services/lead-lines'
import { addLeadNote, changeLeadStatus, createLead, createTrial, getLead } from '../../server/services/leads'
import { forecastHousehold } from '../../server/services/forecast'
import { householdDisplayStatus } from '../../shared/utils/labels'
import { summarizeLeadLine } from '../../shared/utils/lead-line-summary'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

async function offeringId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], programIdValue: number) {
  const [row] = await db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, programIdValue))
  return row!.id
}

describe('M8 lead detail household status', () => {
  it('returns mixed line outcomes, line notes, household notes, and line-owned trials', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Matt',
        lastName: 'Smith',
        phone: '8015556200',
        programId: adult,
        source: 'WALK_IN',
      })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Sam',
        lastName: 'Smith',
        programId: kids,
        age: 8,
        notes: 'Prefers Wednesday.',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, {
        notes: 'Dad trains evenings.',
        membershipOfferingId: await offeringId(testDb.db, adult),
      })
      await addLeadNote(testDb.db, household.id, 'Call after 5.')

      const now = utcNowMs()
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 86_400_000),
        label: 'Dad intro',
        leadLineId: household.lines[0]!.id,
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 172_800_000),
        label: 'Sam intro',
        leadLineId: child.id,
      })

      await convertLeadLine(testDb.db, household.lines[0]!.id, { note: 'Joined adult.' })
      const reasons = await listLostReasons(testDb.db)
      await markLeadLineLost(testDb.db, child.id, { lostReasonId: reasons[0]!.id, note: 'Moved.' })

      const lead = await getLead(testDb.db, household.id)
      expect(lead.lines).toHaveLength(2)
      expect(lead.lines.find(line => line.relationship === 'SELF')?.status).toBe('JOINED')
      expect(lead.lines.find(line => line.relationship === 'CHILD')?.status).toBe('LOST')
      expect(lead.closedAt).toBeTruthy()
      expect(householdIsClosed(lead.lines)).toBe(true)
      expect(lead.notes.some(note => note.body === 'Call after 5.')).toBe(true)
      expect(lead.lines.find(line => line.relationship === 'SELF')?.notes).toBe('Dad trains evenings.')
      expect(lead.lines.find(line => line.relationship === 'CHILD')?.notes).toBe('Prefers Wednesday.')
      expect(lead.lines.find(line => line.relationship === 'SELF')?.trials.some(trial => trial.label === 'Dad intro')).toBe(true)
      expect(lead.lines.find(line => line.relationship === 'CHILD')?.trials.some(trial => trial.label === 'Sam intro')).toBe(true)
      expect(lead.followUpTasks.some(task => (task.linkedLines?.length ?? 0) > 0)).toBe(true)

      const display = householdDisplayStatus(lead)
      expect(display.label).toBe('Closed · mixed outcomes')
      expect(display.kind).toBe('derived')

      const parentSummary = summarizeLeadLine(lead.lines.find(row => row.relationship === 'SELF')!)
      const childSummary = summarizeLeadLine(lead.lines.find(row => row.relationship === 'CHILD')!)
      expect(parentSummary.kind).toBe('joined')
      expect(parentSummary.latestTrial?.label).toBe('Dad intro')
      expect(parentSummary.conversion?.monthlyCents).toBeGreaterThan(0)
      expect(parentSummary.forecastMonthlyCents).toBeNull()
      expect(childSummary.kind).toBe('lost')
      expect(childSummary.lost?.reasonName).toBeTruthy()
      expect(childSummary.latestTrial?.label).toBe('Sam intro')

      expect(lead.email).toBeNull()
      expect(lead.campaign).toBeNull()
      expect(lead.utmSource).toBeNull()
      expect(lead.utmMedium).toBeNull()
      expect(lead.utmContent).toBeNull()
      const forecast = await forecastHousehold(testDb.db, household.id)
      expect(forecast.monthlyCents).toBe(0)
      expect(forecast.lines.every(row => !row.includedInForecast)).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('keeps a household active when one line is terminal and a sibling is still open', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Riley',
        phone: '8015556201',
        programId: adult,
        source: 'WALK_IN',
      })
      const sibling = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Quinn',
        programId: adult,
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, {
        membershipOfferingId: await offeringId(testDb.db, adult),
      })
      await convertLeadLine(testDb.db, household.lines[0]!.id, {})
      const lead = await getLead(testDb.db, household.id)
      expect(lead.closedAt).toBeNull()
      expect(lead.lines.find(line => line.id === sibling.id)?.status).not.toBe('JOINED')
      const display = householdDisplayStatus(lead)
      expect(display.label).toBe('Active · mixed outcomes')
    } finally {
      await testDb.close()
    }
  })

  it('reopens a lost line and still supports single-line header JOINED compatibility', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Casey',
        phone: '8015556202',
        programId: adult,
        source: 'WALK_IN',
      })
      const reasons = await listLostReasons(testDb.db)
      await markLeadLineLost(testDb.db, household.lines[0]!.id, { lostReasonId: reasons[0]!.id })
      await changeLeadLineStatus(testDb.db, household.lines[0]!.id, { toStatus: 'CONTACTED', note: 'Reopened.' })
      const reopened = await getLead(testDb.db, household.id)
      expect(reopened.lines[0]?.status).toBe('CONTACTED')
      expect(reopened.closedAt).toBeNull()

      const solo = await createLead(testDb.db, {
        firstName: 'Solo',
        phone: '8015556203',
        programId: adult,
        source: 'WALK_IN',
      })
      await changeLeadStatus(testDb.db, solo.id, { toStatus: 'JOINED', monthlyRateCents: 17500, note: 'Joined.' })
      const joined = await getLead(testDb.db, solo.id)
      expect(joined.status).toBe('JOINED')
      expect(joined.lines).toHaveLength(1)
      expect(joined.lines[0]?.status).toBe('JOINED')
      expect(householdDisplayStatus(joined).label).toBe('Joined')
    } finally {
      await testDb.close()
    }
  })
})
