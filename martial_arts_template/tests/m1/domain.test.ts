import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { dollarsToCents, centsToDollarString } from '../../shared/utils/money'
import {
  campaigns,
  followUpTasks,
  leadNotes,
  leadStatusHistory,
  leads,
  programs,
  trials,
  users,
} from '../../server/database/schema'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

describe('M1 domain', () => {
  it('migrates and seeds programs and a development admin', async () => {
    const testDb = await openTestDatabase()
    try {
      const seeded = await testDb.db.select().from(programs)
      const codes = seeded.map(row => row.code).sort()
      expect(codes).toEqual(['ADULT_BJJ', 'KIDS_BJJ', 'STRIKING', 'WRESTLING'])

      const adult = seeded.find(row => row.code === 'ADULT_BJJ')
      const kids = seeded.find(row => row.code === 'KIDS_BJJ')
      const striking = seeded.find(row => row.code === 'STRIKING')
      const wrestling = seeded.find(row => row.code === 'WRESTLING')
      expect(adult?.active).toBe(true)
      expect(adult?.seasonal).toBe(false)
      expect(kids?.active).toBe(true)
      expect(kids?.seasonal).toBe(false)
      expect(striking?.active).toBe(false)
      expect(striking?.seasonal).toBe(true)
      expect(wrestling?.active).toBe(false)
      expect(wrestling?.seasonal).toBe(true)
      expect(seeded.some(row => row.code === 'MUAY_THAI')).toBe(false)

      const admins = await testDb.db.select().from(users)
      expect(admins).toHaveLength(1)
      expect(admins[0]?.email).toBe('admin@local')
      expect(admins[0]?.role).toBe('ADMIN')
      expect(admins[0]?.passwordHash).toBeTruthy()
    } finally {
      await testDb.close()
    }
  })

  it('allows a lead to reference a program and campaign, with child fields and duplicate phones', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))

      const [campaign] = await testDb.db.insert(campaigns).values({
        name: 'Fall Adult Capture',
        slug: 'fall-adult-capture',
        channel: 'FACEBOOK',
        active: true,
        createdAt: now,
        updatedAt: now,
      }).returning()

      await testDb.db.insert(leads).values([
        {
          firstName: 'Alex',
          lastName: 'Parent',
          phone: '8015550100',
          programId: kids!.id,
          experienceLevel: 'NONE',
          source: 'INSTAGRAM',
          status: 'NEW',
          participantFirstName: 'Sam',
          participantLastName: 'Kid',
          participantAge: 8,
          guardianRelationship: 'parent',
          campaignId: campaign!.id,
          smsConsent: true,
          smsConsentAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          firstName: 'Jordan',
          phone: '8015550100',
          email: 'jordan@example.com',
          programId: adult!.id,
          source: 'WALK_IN',
          createdAt: now,
          updatedAt: now,
        },
        {
          firstName: 'Morgan',
          email: 'jordan@example.com',
          programId: adult!.id,
          source: 'WEBSITE',
          createdAt: now,
          updatedAt: now,
        },
      ])

      const withProgram = await testDb.db.query.leads.findMany({
        with: { program: true, campaign: true },
      })
      expect(withProgram).toHaveLength(3)
      expect(withProgram.filter(row => row.phone === '8015550100')).toHaveLength(2)
      expect(withProgram.filter(row => row.email === 'jordan@example.com')).toHaveLength(2)

      const kidLead = withProgram.find(row => row.participantFirstName === 'Sam')
      expect(kidLead?.program.code).toBe('KIDS_BJJ')
      expect(kidLead?.campaign?.slug).toBe('fall-adult-capture')
      expect(kidLead?.guardianRelationship).toBe('parent')
    } finally {
      await testDb.close()
    }
  })

  it('allows multiple trials, follow-up tasks, notes, and status history per lead', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      const [admin] = await testDb.db.select().from(users)

      const [lead] = await testDb.db.insert(leads).values({
        firstName: 'Riley',
        phone: '8015550199',
        programId: adult!.id,
        source: 'PHONE',
        monthlyRateCents: dollarsToCents('175'),
        createdAt: now,
        updatedAt: now,
      }).returning()

      await testDb.db.insert(trials).values([
        {
          leadId: lead!.id,
          scheduledAt: now,
          label: 'Tuesday intro',
          status: 'NO_SHOW',
          createdAt: now,
          updatedAt: now,
        },
        {
          leadId: lead!.id,
          scheduledAt: new Date(now.getTime() + 86_400_000),
          label: 'Thursday intro',
          status: 'SCHEDULED',
          createdAt: now,
          updatedAt: now,
        },
      ])

      await testDb.db.insert(followUpTasks).values([
        {
          leadId: lead!.id,
          type: 'PHONE_CALL',
          dueAt: now,
          status: 'COMPLETED',
          assignedUserId: admin!.id,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          leadId: lead!.id,
          type: 'PHONE_CALL',
          dueAt: new Date(now.getTime() + 86_400_000),
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        },
      ])

      await testDb.db.insert(leadNotes).values({
        leadId: lead!.id,
        body: 'Called, left voicemail.',
        createdByUserId: admin!.id,
        createdAt: now,
        updatedAt: now,
      })

      await testDb.db.insert(leadStatusHistory).values({
        leadId: lead!.id,
        fromStatus: 'NEW',
        toStatus: 'TRIAL_SCHEDULED',
        changedByUserId: admin!.id,
        note: 'Walk-in booked same day.',
        createdAt: now,
      })

      const loaded = await testDb.db.query.leads.findFirst({
        where: eq(leads.id, lead!.id),
        with: {
          trials: true,
          followUpTasks: true,
          notes: true,
          statusHistory: true,
        },
      })

      expect(loaded?.trials).toHaveLength(2)
      expect(loaded?.followUpTasks).toHaveLength(2)
      expect(loaded?.notes).toHaveLength(1)
      expect(loaded?.statusHistory[0]?.toStatus).toBe('TRIAL_SCHEDULED')
      expect(loaded?.monthlyRateCents).toBe(17500)
    } finally {
      await testDb.close()
    }
  })

  it('does not enforce a three-trial database limit', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      const [lead] = await testDb.db.insert(leads).values({
        firstName: 'Casey',
        email: 'casey@example.com',
        programId: adult!.id,
        source: 'OTHER',
        createdAt: now,
        updatedAt: now,
      }).returning()

      await testDb.db.insert(trials).values(
        Array.from({ length: 4 }, (_, index) => ({
          leadId: lead!.id,
          scheduledAt: new Date(now.getTime() + index * 86_400_000),
          status: 'SCHEDULED' as const,
          createdAt: now,
          updatedAt: now,
        })),
      )

      const rows = await testDb.db.select().from(trials).where(eq(trials.leadId, lead!.id))
      expect(rows).toHaveLength(4)
    } finally {
      await testDb.close()
    }
  })

  it('enforces phone or email at the database and allows either contact method', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))

      await expect(testDb.db.insert(leads).values({
        firstName: 'NoContact',
        programId: adult!.id,
        source: 'OTHER',
        createdAt: now,
        updatedAt: now,
      })).rejects.toThrow()

      await expect(testDb.db.insert(leads).values({
        firstName: 'EmptyContact',
        phone: '',
        email: '',
        programId: adult!.id,
        source: 'OTHER',
        createdAt: now,
        updatedAt: now,
      })).rejects.toThrow()

      const [phoneOnly] = await testDb.db.insert(leads).values({
        firstName: 'PhoneOnly',
        phone: '8015550200',
        programId: adult!.id,
        source: 'PHONE',
        createdAt: now,
        updatedAt: now,
      }).returning()
      const [emailOnly] = await testDb.db.insert(leads).values({
        firstName: 'EmailOnly',
        email: 'email-only@example.com',
        programId: adult!.id,
        source: 'WEBSITE',
        createdAt: now,
        updatedAt: now,
      }).returning()
      const [both] = await testDb.db.insert(leads).values({
        firstName: 'Both',
        phone: '8015550201',
        email: 'both@example.com',
        programId: adult!.id,
        source: 'WALK_IN',
        createdAt: now,
        updatedAt: now,
      }).returning()

      expect(phoneOnly?.phone).toBe('8015550200')
      expect(phoneOnly?.email).toBeNull()
      expect(emailOnly?.phone).toBeNull()
      expect(emailOnly?.email).toBe('email-only@example.com')
      expect(both?.phone).toBe('8015550201')
      expect(both?.email).toBe('both@example.com')
    } finally {
      await testDb.close()
    }
  })
})

describe('money helpers', () => {
  it('converts dollars to integer cents without floating point', () => {
    expect(dollarsToCents('175')).toBe(17500)
    expect(dollarsToCents('175.50')).toBe(17550)
    expect(centsToDollarString(17500)).toBe('175.00')
    expect(() => dollarsToCents('175.555')).toThrow()
  })
})
