import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { conversions, followUpTasks, membershipOfferings, programs, users } from '../../server/database/schema'
import { listLostReasons, upsertMembershipOffering } from '../../server/services/catalog'
import { convertLeadLine, markLeadLineLost, reverseConversion } from '../../server/services/conversion'
import { DomainError } from '../../server/services/errors'
import { createManualFollowUpTask } from '../../server/services/follow-up'
import { addLeadLineToHousehold, updateLeadLine } from '../../server/services/lead-lines'
import { createLead, createTrial, getLead } from '../../server/services/leads'
import type { SessionUser } from '../../server/services/authorization'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

async function programId(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], code: string) {
  const [row] = await db.select().from(programs).where(eq(programs.code, code))
  return row!.id
}

async function adminActor(db: Awaited<ReturnType<typeof openTestDatabase>>['db']): Promise<SessionUser> {
  const [admin] = await db.select().from(users).where(eq(users.username, 'admin'))
  return { id: admin!.id, email: admin!.email, displayName: admin!.displayName, role: 'ADMIN' }
}

describe('M8 conversion and lost outcomes', () => {
  it('snapshots conversion value and keeps history after the offering price changes', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      const household = await createLead(testDb.db, {
        firstName: 'Alex',
        phone: '8015554100',
        programId: adult,
        source: 'WALK_IN',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering!.id })
      const conversion = await convertLeadLine(testDb.db, household.lines[0]!.id, { note: 'Signed up.' }, await adminActor(testDb.db))
      expect(conversion.monthlyCents).toBe(17500)
      expect(conversion.offeringName).toBe(offering!.name)
      expect(conversion.reversedAt).toBeNull()

      await upsertMembershipOffering(testDb.db, {
        id: offering!.id,
        name: offering!.name,
        programId: offering!.programId,
        monthlyCents: 19900,
        enrollmentCents: offering!.enrollmentCents,
        active: true,
      })
      const [stored] = await testDb.db.select().from(conversions).where(eq(conversions.id, conversion.id))
      expect(stored?.monthlyCents).toBe(17500)
      const lead = await getLead(testDb.db, household.id)
      expect(lead.lines[0]?.status).toBe('JOINED')
      expect(lead.lines[0]?.conversions?.some(row => row.id === conversion.id && row.monthlyCents === 17500)).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('allows only one active conversion per line and converts siblings independently', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      const household = await createLead(testDb.db, {
        firstName: 'Jordan',
        phone: '8015554101',
        programId: adult,
        source: 'WALK_IN',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering!.id })
      const spouse = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Riley',
        programId: adult,
        membershipOfferingId: offering!.id,
      })
      await convertLeadLine(testDb.db, household.lines[0]!.id, {})
      await expect(convertLeadLine(testDb.db, household.lines[0]!.id, {})).rejects.toBeInstanceOf(DomainError)
      const second = await convertLeadLine(testDb.db, spouse.id, {})
      expect(second.monthlyCents).toBe(15500)
      const lead = await getLead(testDb.db, household.id)
      expect(lead.lines.every(line => line.status === 'JOINED')).toBe(true)
      expect(lead.closedAt).toBeTruthy()
    } finally {
      await testDb.close()
    }
  })

  it('lets ADMIN reverse a conversion and preserves the snapshot row', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      const household = await createLead(testDb.db, {
        firstName: 'Casey',
        phone: '8015554102',
        programId: adult,
        source: 'PHONE',
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering!.id })
      const conversion = await convertLeadLine(testDb.db, household.lines[0]!.id, {}, await adminActor(testDb.db))
      const staff: SessionUser = {
        id: 99,
        email: 'staff@local',
        displayName: 'Staff',
        role: 'STAFF',
      }
      await expect(reverseConversion(testDb.db, conversion.id, { note: 'Mistake' }, staff)).rejects.toMatchObject({ statusCode: 403 })
      const reversed = await reverseConversion(testDb.db, conversion.id, { note: 'Entered on the wrong person.' }, await adminActor(testDb.db))
      expect(reversed.reversedAt).toBeTruthy()
      expect(reversed.reverseNote).toBe('Entered on the wrong person.')
      expect(reversed.monthlyCents).toBe(17500)
      const lead = await getLead(testDb.db, household.id)
      expect(lead.lines[0]?.status).toBe('TRIAL_ATTENDED')
      const again = await convertLeadLine(testDb.db, household.lines[0]!.id, {}, await adminActor(testDb.db))
      expect(again.id).not.toBe(conversion.id)
    } finally {
      await testDb.close()
    }
  })

  it('requires a lost reason, leaves siblings active, and preserves history on reopen', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Pat',
        phone: '8015554103',
        programId: adult,
        source: 'REFERRAL',
      })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Sam',
        programId: kids,
        age: 8,
      })
      await expect(markLeadLineLost(testDb.db, child.id, { lostReasonId: 99999 })).rejects.toBeInstanceOf(DomainError)
      const reasons = await listLostReasons(testDb.db, { activeOnly: true })
      const price = reasons.find(row => row.code === 'PRICE')!
      await markLeadLineLost(testDb.db, child.id, { lostReasonId: price.id, note: 'Too expensive for kids.' }, await adminActor(testDb.db))
      let lead = await getLead(testDb.db, household.id)
      expect(lead.lines.find(line => line.id === child.id)?.status).toBe('LOST')
      expect(lead.lines.find(line => line.relationship === 'SELF')?.status).not.toBe('LOST')
      expect(lead.closedAt).toBeNull()
      const { changeLeadLineStatus } = await import('../../server/services/lead-lines')
      await changeLeadLineStatus(testDb.db, child.id, { toStatus: 'CONTACTED', note: 'Trying again.' }, await adminActor(testDb.db))
      lead = await getLead(testDb.db, household.id)
      const lost = lead.lines.find(line => line.id === child.id)
      expect(lost?.status).toBe('CONTACTED')
      expect(lost?.lostOutcomes?.some(row => row.reopenedAt && row.lostReason?.name === 'Price')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('cancels only obsolete pending follow-up for that line', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      const household = await createLead(testDb.db, {
        firstName: 'Drew',
        phone: '8015554104',
        programId: adult,
        source: 'WALK_IN',
      })
      const spouse = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Avery',
        programId: adult,
        membershipOfferingId: offering!.id,
      })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: offering!.id })
      const due = new Date(utcNowMs() + 86_400_000)
      await createTrial(testDb.db, household.id, {
        scheduledAt: due,
        label: 'Drew intro',
        leadLineId: household.lines[0]!.id,
      })
      const shared = await createManualFollowUpTask(testDb.db, {
        leadId: household.id,
        dueAt: due,
        notes: 'Household check-in',
      })
      const lineTask = await createManualFollowUpTask(testDb.db, {
        leadId: household.id,
        dueAt: due,
        notes: 'Drew only',
        leadLineIds: [household.lines[0]!.id],
      })
      await convertLeadLine(testDb.db, household.lines[0]!.id, {})
      const after = await getLead(testDb.db, household.id)
      const initial = after.followUpTasks?.find(task => task.purpose === 'INITIAL_SCHEDULE')
      expect(initial?.status).toBe('CANCELLED')
      const sharedRow = after.followUpTasks?.find(task => task.id === shared.id)
      const lineRow = after.followUpTasks?.find(task => task.id === lineTask.id)
      expect(sharedRow?.status).toBe('PENDING')
      expect(lineRow?.status).toBe('CANCELLED')
      expect(after.lines.find(line => line.id === spouse.id)?.status).not.toBe('JOINED')
      const leftover = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.id, shared.id))
      expect(leftover[0]?.status).toBe('PENDING')
    } finally {
      await testDb.close()
    }
  })

  it('converts when the offering is sent on convert instead of saved first', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const [offering] = await testDb.db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adult))
      const household = await createLead(testDb.db, {
        firstName: 'Drew',
        phone: '8015554109',
        programId: adult,
        source: 'WALK_IN',
      })
      expect(household.lines[0]?.membershipOfferingId).toBeNull()
      await expect(convertLeadLine(testDb.db, household.lines[0]!.id, {})).rejects.toMatchObject({
        message: 'Select an offering before converting this person.',
      })
      const conversion = await convertLeadLine(testDb.db, household.lines[0]!.id, {
        membershipOfferingId: offering!.id,
        note: 'Chose Adult BJJ at convert.',
      })
      expect(conversion.membershipOfferingId).toBe(offering!.id)
      expect(conversion.offeringName).toBe(offering!.name)
      expect(conversion.monthlyCents).toBe(17500)
      const lead = await getLead(testDb.db, household.id)
      expect(lead.lines[0]?.status).toBe('JOINED')
      expect(lead.lines[0]?.membershipOfferingId).toBe(offering!.id)
    } finally {
      await testDb.close()
    }
  })
})
