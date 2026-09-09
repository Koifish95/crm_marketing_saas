import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { campaigns, programs } from '../../server/database/schema'
import { canWriteCrm } from '../../server/services/authorization'
import {
  addLeadNote,
  changeLeadStatus,
  createLead,
  createTrial,
  findDuplicateLeads,
  listLeads,
  rescheduleTrial,
  setTrialOutcome,
  updateLead,
} from '../../server/services/leads'
import { isStatusCorrection } from '../../server/services/lead-status'
import { listPublicSlots } from '../../server/services/availability'
import { dollarsToCents } from '../../shared/utils/money'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

async function adultProgramId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [adult] = await db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
  return adult!.id
}

async function kidsProgramId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [kids] = await db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
  return kids!.id
}

describe('M3 lead CRM', () => {
  it('creates adult, kids, phone-only, and email-only leads', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await adultProgramId(testDb.db)
      const kidsId = await kidsProgramId(testDb.db)

      const adult = await createLead(testDb.db, {
        firstName: 'Alex',
        lastName: 'Adult',
        phone: '8015551000',
        programId: adultId,
        source: 'WALK_IN',
      })
      const kids = await createLead(testDb.db, {
        firstName: 'Pat',
        lastName: 'Parent',
        email: 'pat@example.com',
        programId: kidsId,
        source: 'INSTAGRAM',
        participantFirstName: 'Sam',
        participantAge: 8,
        guardianRelationship: 'parent',
      })
      const phoneOnly = await createLead(testDb.db, {
        firstName: 'Phone',
        phone: '8015551001',
        programId: adultId,
        source: 'PHONE',
      })
      const emailOnly = await createLead(testDb.db, {
        firstName: 'Email',
        email: 'email-only@example.com',
        programId: adultId,
        source: 'WEBSITE',
      })

      expect(adult.program.code).toBe('ADULT_BJJ')
      expect(kids.participantFirstName).toBe('Sam')
      expect(kids.guardianRelationship).toBe('parent')
      expect(phoneOnly.email).toBeNull()
      expect(emailOnly.phone).toBeNull()
      expect(adult.statusHistory.some(item => item.toStatus === 'NEW')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('searches and filters leads', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await adultProgramId(testDb.db)
      await createLead(testDb.db, { firstName: 'Riley', phone: '8015552000', programId: adultId, source: 'WALK_IN' })
      await createLead(testDb.db, { firstName: 'Jordan', email: 'jordan@example.com', programId: adultId, source: 'INSTAGRAM' })

      const named = await listLeads(testDb.db, { search: 'Riley' })
      expect(named).toHaveLength(1)
      const instagram = await listLeads(testDb.db, { source: 'INSTAGRAM' })
      expect(instagram).toHaveLength(1)
      const byStatus = await listLeads(testDb.db, { status: 'ACTIVE' })
      expect(byStatus.length).toBeGreaterThanOrEqual(2)
      const byProgram = await listLeads(testDb.db, { programId: adultId })
      expect(byProgram).toHaveLength(2)
    } finally {
      await testDb.close()
    }
  })

  it('updates lead contact without erasing status history', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await adultProgramId(testDb.db)
      const lead = await createLead(testDb.db, {
        firstName: 'Casey',
        phone: '8015552100',
        programId: adultId,
        source: 'WALK_IN',
      })
      await changeLeadStatus(testDb.db, lead.id, { toStatus: 'CONTACTED' })

      const updated = await updateLead(testDb.db, lead.id, {
        firstName: 'Casey',
        lastName: 'Updated',
        email: 'casey@example.com',
        phone: '8015552100',
        programId: adultId,
        source: 'WALK_IN',
      })

      expect(updated.lastName).toBe('Updated')
      expect(updated.email).toBe('casey@example.com')
      expect(updated.status).toBe('CONTACTED')
      expect(updated.statusHistory.some(item => item.toStatus === 'NEW')).toBe(true)
      expect(updated.statusHistory.some(item => item.toStatus === 'CONTACTED')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('allows forward skips and requires a note for corrections', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await adultProgramId(testDb.db)
      const lead = await createLead(testDb.db, {
        firstName: 'Skip',
        phone: '8015553000',
        programId: adultId,
        source: 'WALK_IN',
      })

      const skipped = await changeLeadStatus(testDb.db, lead.id, { toStatus: 'TRIAL_SCHEDULED' })
      expect(skipped.status).toBe('TRIAL_SCHEDULED')
      expect(isStatusCorrection('NEW', 'TRIAL_SCHEDULED')).toBe(false)
      expect(isStatusCorrection('TRIAL_ATTENDED', 'TRIAL_SCHEDULED')).toBe(true)
      expect(isStatusCorrection('NO_SHOW', 'TRIAL_SCHEDULED')).toBe(false)

      await changeLeadStatus(testDb.db, lead.id, {
        toStatus: 'JOINED',
        monthlyRateCents: dollarsToCents('175'),
      })
      await expect(changeLeadStatus(testDb.db, lead.id, { toStatus: 'RESPONDED' })).rejects.toThrow(/note/)
      const corrected = await changeLeadStatus(testDb.db, lead.id, {
        toStatus: 'RESPONDED',
        note: 'Joined in error; still talking.',
      })
      expect(corrected.status).toBe('RESPONDED')
      expect(corrected.statusHistory.some(item => item.note?.includes('Joined in error'))).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('adds notes, warns on duplicates, and records join rate', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await adultProgramId(testDb.db)
      const first = await createLead(testDb.db, {
        firstName: 'Dup',
        phone: '8015554000',
        email: 'dup@example.com',
        programId: adultId,
        source: 'PHONE',
      })
      await createLead(testDb.db, {
        firstName: 'DupTwo',
        phone: '8015554000',
        programId: adultId,
        source: 'WALK_IN',
      })
      const duplicates = await findDuplicateLeads(testDb.db, { phone: '8015554000', excludeId: first.id })
      expect(duplicates.length).toBeGreaterThan(0)
      const formatted = await findDuplicateLeads(testDb.db, { phone: '(801) 555-4000', excludeId: first.id })
      expect(formatted.some(row => row.id !== first.id)).toBe(true)

      const noted = await addLeadNote(testDb.db, first.id, 'Called, left voicemail.')
      expect(noted.notes).toHaveLength(1)

      await expect(changeLeadStatus(testDb.db, first.id, { toStatus: 'JOINED' })).rejects.toThrow(/monthly rate/)

      const joined = await changeLeadStatus(testDb.db, first.id, {
        toStatus: 'JOINED',
        monthlyRateCents: 17500,
      })
      expect(joined.monthlyRateCents).toBe(17500)
      expect(joined.joinedAt).toBeTruthy()
    } finally {
      await testDb.close()
    }
  })

  it('manages trials including reschedule history', async () => {
    const testDb = await openTestDatabase()
    try {
      const adultId = await adultProgramId(testDb.db)
      const [campaign] = await testDb.db.insert(campaigns).values({
        name: 'Test',
        slug: 'test-campaign',
        active: true,
        createdAt: new Date(utcNowMs()),
        updatedAt: new Date(utcNowMs()),
      }).returning()

      const lead = await createLead(testDb.db, {
        firstName: 'Trialist',
        phone: '8015555000',
        programId: adultId,
        source: 'REFERRAL',
        campaignId: campaign!.id,
      })

      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(utcNowMs() + 86_400_000),
        label: 'Tuesday intro',
      })
      expect(scheduled.status).toBe('TRIAL_SCHEDULED')
      expect(scheduled.trials).toHaveLength(1)
      const byCampaign = await listLeads(testDb.db, { campaignId: campaign!.id })
      expect(byCampaign).toHaveLength(1)

      const firstTrialId = scheduled.trials[0]!.id
      const noShow = await setTrialOutcome(testDb.db, firstTrialId, { status: 'NO_SHOW' })
      expect(noShow.status).toBe('NO_SHOW')
      expect(noShow.trials[0]?.status).toBe('NO_SHOW')

      const again = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(utcNowMs() + 2 * 86_400_000),
        label: 'Thursday intro',
      })
      const second = again.trials.find(trial => trial.status === 'SCHEDULED')!
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ' })
      expect(slots.length).toBeGreaterThan(0)
      const rescheduled = await rescheduleTrial(testDb.db, second.id, {
        slotId: slots[0]!.id,
      })
      const cancelled = rescheduled.trials.filter(trial => trial.status === 'CANCELLED')
      const active = rescheduled.trials.filter(trial => trial.status === 'SCHEDULED')
      expect(cancelled.length).toBeGreaterThan(0)
      expect(active).toHaveLength(1)

      const extra = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(utcNowMs() + 4 * 86_400_000),
        label: 'Extra intro',
      })
      const extraScheduled = extra.trials.find(trial => trial.status === 'SCHEDULED' && trial.label === 'Extra intro')!
      const cancelledOutcome = await setTrialOutcome(testDb.db, extraScheduled.id, { status: 'CANCELLED' })
      expect(cancelledOutcome.trials.find(trial => trial.id === extraScheduled.id)?.status).toBe('CANCELLED')

      const attended = await setTrialOutcome(testDb.db, active[0]!.id, { status: 'ATTENDED' })
      expect(attended.status).toBe('TRIAL_ATTENDED')
      expect(attended.trials.length).toBeGreaterThanOrEqual(4)
    } finally {
      await testDb.close()
    }
  })

  it('rejects VIEWER writes conceptually', () => {
    expect(canWriteCrm('ADMIN')).toBe(true)
    expect(canWriteCrm('STAFF')).toBe(true)
    expect(canWriteCrm('VIEWER')).toBe(false)
  })
})
