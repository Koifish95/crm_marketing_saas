import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { followUpTaskLines, membershipOfferings, programs } from '../../server/database/schema'
import { listLostReasons } from '../../server/services/catalog'
import { convertLeadLine, markLeadLineLost } from '../../server/services/conversion'
import {
  addLeadLineToHousehold,
  changeLeadLineStatus,
  householdIsClosed,
  updateLeadLine,
} from '../../server/services/lead-lines'
import { createLead, createTrial, getLead, setTrialOutcome } from '../../server/services/leads'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

async function adultId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [row] = await db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
  return row!.id
}

async function kidsId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [row] = await db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
  return row!.id
}

describe('M8 household model', () => {
  it('creates a one-person household as a SELF line', async () => {
    const testDb = await openTestDatabase()
    try {
      const lead = await createLead(testDb.db, {
        firstName: 'Alex',
        lastName: 'Adult',
        phone: '8015552000',
        programId: await adultId(testDb.db),
        source: 'WALK_IN',
      })
      expect(lead.lines).toHaveLength(1)
      expect(lead.lines[0]?.relationship).toBe('SELF')
      expect(lead.lines[0]?.firstName).toBe('Alex')
      expect(lead.lines[0]?.trials).toHaveLength(0)
      expect(lead.closedAt).toBeNull()
    } finally {
      await testDb.close()
    }
  })

  it('keeps a parent-only contact off the lines when the child is the prospective member', async () => {
    const testDb = await openTestDatabase()
    try {
      const lead = await createLead(testDb.db, {
        firstName: 'Pat',
        lastName: 'Parent',
        phone: '8015552001',
        programId: await kidsId(testDb.db),
        source: 'INSTAGRAM',
        participantFirstName: 'Sam',
        participantLastName: 'Kid',
        participantAge: 8,
        guardianRelationship: 'parent',
      })
      expect(lead.lines).toHaveLength(1)
      expect(lead.lines[0]?.relationship).toBe('CHILD')
      expect(lead.lines[0]?.firstName).toBe('Sam')
      expect(lead.lines.some(line => line.firstName === 'Pat')).toBe(false)
      expect(lead.firstName).toBe('Pat')
    } finally {
      await testDb.close()
    }
  })

  it('supports multiple lines, independent trials, and mixed terminal outcomes', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await adultId(testDb.db)
      const kids = await kidsId(testDb.db)
      const household = await createLead(testDb.db, {
        firstName: 'Jordan',
        lastName: 'Father',
        phone: '8015552002',
        programId: adult,
        source: 'WALK_IN',
      })
      const father = household.lines[0]!
      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Riley',
        programId: kids,
        age: 9,
      })
      const withChild = await getLead(testDb.db, household.id)
      expect(withChild.lines).toHaveLength(2)
      const child = withChild.lines.find(line => line.relationship === 'CHILD')!

      const now = utcNowMs()
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 86_400_000),
        label: 'Father intro',
        leadLineId: father.id,
      })
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 172_800_000),
        label: 'Child intro',
        leadLineId: child.id,
      })
      const afterTrials = await getLead(testDb.db, household.id)
      const fatherLine = afterTrials.lines.find(line => line.id === father.id)!
      const childLine = afterTrials.lines.find(line => line.id === child.id)!
      expect(fatherLine.trials).toHaveLength(1)
      expect(childLine.trials).toHaveLength(1)
      expect(fatherLine.trials[0]?.leadLineId ?? fatherLine.trials[0]?.id).toBeTruthy()
      expect(afterTrials.trials).toHaveLength(2)

      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(now + 259_200_000),
        label: 'Father second intro',
        leadLineId: father.id,
      })
      const twoFatherTrials = await getLead(testDb.db, household.id)
      expect(twoFatherTrials.lines.find(line => line.id === father.id)?.trials).toHaveLength(2)

      const [adultOffering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      await updateLeadLine(testDb.db, father.id, { membershipOfferingId: adultOffering!.id })
      await convertLeadLine(testDb.db, father.id, { note: 'Joined adult.' })
      let mixed = await getLead(testDb.db, household.id)
      expect(mixed.lines.find(line => line.id === father.id)?.status).toBe('JOINED')
      expect(mixed.lines.find(line => line.id === child.id)?.status).not.toBe('LOST')
      expect(mixed.closedAt).toBeNull()
      expect(householdIsClosed(mixed.lines)).toBe(false)

      const reasons = await listLostReasons(testDb.db, { activeOnly: true })
      await markLeadLineLost(testDb.db, child.id, { lostReasonId: reasons[0]!.id, note: 'Not a fit.' })
      mixed = await getLead(testDb.db, household.id)
      expect(mixed.lines.find(line => line.id === father.id)?.status).toBe('JOINED')
      expect(mixed.lines.find(line => line.id === child.id)?.status).toBe('LOST')
      expect(mixed.closedAt).toBeTruthy()

      await changeLeadLineStatus(testDb.db, child.id, { toStatus: 'CONTACTED', note: 'Reopened.' })
      const reopened = await getLead(testDb.db, household.id)
      expect(reopened.lines.find(line => line.id === child.id)?.status).toBe('CONTACTED')
      expect(reopened.closedAt).toBeNull()
      expect(reopened.lines.find(line => line.id === child.id)?.statusHistory.some(item => item.toStatus === 'LOST')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('attaches automatic follow-up to the trial line and keeps header ownership', async () => {
    const testDb = await openTestDatabase()
    try {
      const lead = await createLead(testDb.db, {
        firstName: 'Casey',
        phone: '8015552003',
        programId: await adultId(testDb.db),
        source: 'PHONE',
      })
      const lineId = lead.lines[0]!.id
      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(utcNowMs() + 86_400_000),
        label: 'Casey intro',
        leadLineId: lineId,
      })
      const task = scheduled.followUpTasks.find(item => item.purpose === 'INITIAL_SCHEDULE')
      expect(task?.leadId).toBe(lead.id)
      const links = await testDb.db.select().from(followUpTaskLines)
      expect(links.some(link => link.leadLineId === lineId)).toBe(true)

      const trialId = scheduled.trials.find(trial => trial.status === 'SCHEDULED')!.id
      await setTrialOutcome(testDb.db, trialId, { status: 'ATTENDED' })
      const after = await getLead(testDb.db, lead.id)
      expect(after.lines[0]?.status).toBe('TRIAL_ATTENDED')
    } finally {
      await testDb.close()
    }
  })
})
