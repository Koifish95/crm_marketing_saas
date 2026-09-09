import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import { createDb } from '../../server/database'
import {
  leadLines,
  leadPossibleDuplicates,
  leads,
  publicBookingSubmissions,
} from '../../server/database/schema'
import { createCampaign } from '../../server/services/campaigns'
import { DomainError } from '../../server/services/errors'
import * as leadLinesService from '../../server/services/lead-lines'
import { createLead, getLead, listLeads } from '../../server/services/leads'
import { createStaffHousehold } from '../../server/services/staff-household'
import { createHouseholdLeadSchema } from '../../shared/schemas/lead'
import { householdDisplayStatus } from '../../shared/utils/labels'
import { openTestDatabase } from '../helpers/db'
import { adminActor, programId } from './helpers/scenarios'

async function codes(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  return {
    adult: await programId(db, 'ADULT_BJJ'),
    kids: await programId(db, 'KIDS_BJJ'),
    wrestling: await programId(db, 'WRESTLING'),
  }
}

describe('staff household create schema', () => {
  it('requires at least one prospective member, phone or email, and at most one SELF', () => {
    const key = randomUUID()
    expect(createHouseholdLeadSchema.safeParse({
      firstName: 'Alex',
      phone: '8015559401',
      source: 'WALK_IN',
      members: [],
      idempotencyKey: key,
    }).success).toBe(false)

    expect(createHouseholdLeadSchema.safeParse({
      firstName: 'Alex',
      source: 'WALK_IN',
      members: [{ relationship: 'SELF', firstName: 'Alex', programId: 1 }],
      idempotencyKey: key,
    }).success).toBe(false)

    const dualSelf = createHouseholdLeadSchema.safeParse({
      firstName: 'Alex',
      phone: '8015559401',
      source: 'WALK_IN',
      members: [
        { relationship: 'SELF', firstName: 'Alex', programId: 1 },
        { relationship: 'SELF', firstName: 'Alex', programId: 1 },
      ],
      idempotencyKey: key,
    })
    expect(dualSelf.success).toBe(false)

    const ok = createHouseholdLeadSchema.safeParse({
      firstName: 'Alex',
      phone: '8015559401',
      source: 'WALK_IN',
      members: [{ relationship: 'SELF', firstName: 'Alex', programId: 1 }],
      idempotencyKey: key,
    })
    expect(ok.success).toBe(true)
  })
})

describe('createStaffHousehold', () => {
  it('creates a one-person SELF household', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult } = await codes(testDb.db)
      const actor = await adminActor(testDb.db)
      const created = await createStaffHousehold(testDb.db, {
        firstName: 'Alex',
        lastName: 'Adult',
        phone: '801-555-9401',
        source: 'WALK_IN',
        members: [{ relationship: 'SELF', firstName: 'Ignored', lastName: 'Name', programId: adult, experienceLevel: 'BEGINNER' }],
        idempotencyKey: randomUUID(),
      }, actor)
      expect(created.replayed).toBe(false)
      expect(created.lead.phone).toBe('8015559401')
      expect(created.lead.lines).toHaveLength(1)
      expect(created.lead.lines[0]?.relationship).toBe('SELF')
      expect(created.lead.lines[0]?.firstName).toBe('Alex')
      expect(created.lead.lines[0]?.programId).toBe(adult)
      expect(created.lead.lines[0]?.status).toBe('NEW')
      expect(created.lead.statusHistory.some(item => item.changedByUserId === actor.id && item.note === 'Lead created.')).toBe(true)
      expect(householdDisplayStatus(created.lead).key).toBe('ACTIVE')
    } finally {
      await testDb.close()
    }
  })

  it('creates a guardian-only household with one child and zero SELF lines', async () => {
    const testDb = await openTestDatabase()
    try {
      const { kids } = await codes(testDb.db)
      const created = await createStaffHousehold(testDb.db, {
        firstName: 'Marta',
        lastName: 'Parent',
        phone: '8015559402',
        source: 'REFERRAL',
        members: [{ relationship: 'CHILD', firstName: 'Ana', lastName: 'Parent', age: 8, programId: kids }],
        idempotencyKey: randomUUID(),
      }, await adminActor(testDb.db))
      expect(created.lead.lines).toHaveLength(1)
      expect(created.lead.lines[0]?.relationship).toBe('CHILD')
      expect(created.lead.lines[0]?.firstName).toBe('Ana')
      expect(created.lead.lines.some(line => line.relationship === 'SELF')).toBe(false)
      expect(created.lead.firstName).toBe('Marta')
    } finally {
      await testDb.close()
    }
  })

  it('creates mixed-program children and a SELF-plus-family household', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult, kids, wrestling } = await codes(testDb.db)
      const kidsOnly = await createStaffHousehold(testDb.db, {
        firstName: 'Morgan',
        lastName: 'Parent',
        phone: '8015559403',
        source: 'WALK_IN',
        notes: 'Walked in after class.',
        members: [
          { relationship: 'CHILD', firstName: 'Avery', lastName: 'Parent', age: 7, programId: kids },
          { relationship: 'CHILD', firstName: 'Blake', lastName: 'Parent', age: 12, programId: wrestling },
          { relationship: 'CHILD', firstName: 'Casey', lastName: 'Parent', age: 9, programId: kids },
        ],
        idempotencyKey: randomUUID(),
      }, await adminActor(testDb.db))
      expect(kidsOnly.lead.lines).toHaveLength(3)
      expect(kidsOnly.lead.lines.map(line => line.relationship)).toEqual(['CHILD', 'CHILD', 'CHILD'])
      expect(kidsOnly.lead.lines.map(line => line.programId).sort()).toEqual([kids, kids, wrestling].sort())
      expect(kidsOnly.lead.notes.some(note => note.body === 'Walked in after class.')).toBe(true)
      expect(kidsOnly.lead.lines.every(line => !line.notes)).toBe(true)

      const mixed = await createStaffHousehold(testDb.db, {
        firstName: 'Jordan',
        lastName: 'Family',
        phone: '8015559404',
        source: 'INSTAGRAM',
        members: [
          { relationship: 'SELF', firstName: 'Jordan', programId: adult },
          { relationship: 'CHILD', firstName: 'Riley', age: 8, programId: kids },
          { relationship: 'CHILD', firstName: 'Taylor', age: 11, programId: wrestling },
          { relationship: 'SPOUSE', firstName: 'Quinn', programId: adult },
        ],
        idempotencyKey: randomUUID(),
      }, await adminActor(testDb.db))
      expect(mixed.lead.lines).toHaveLength(4)
      expect(mixed.lead.lines.filter(line => line.relationship === 'SELF')).toHaveLength(1)
      expect(mixed.lead.lines.find(line => line.firstName === 'Riley')?.programId).toBe(kids)
      expect(mixed.lead.lines.find(line => line.firstName === 'Quinn')?.relationship).toBe('SPOUSE')
    } finally {
      await testDb.close()
    }
  })

  it('rejects a second SELF, zero members, missing kids age, and a missing program', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult, kids } = await codes(testDb.db)
      const actor = await adminActor(testDb.db)
      await expect(createStaffHousehold(testDb.db, {
        firstName: 'Alex',
        phone: '8015559405',
        source: 'WALK_IN',
        members: [
          { relationship: 'SELF', firstName: 'Alex', programId: adult },
          { relationship: 'SELF', firstName: 'Other', programId: adult },
        ],
        idempotencyKey: randomUUID(),
      }, actor)).rejects.toBeInstanceOf(DomainError)

      await expect(createStaffHousehold(testDb.db, {
        firstName: 'Alex',
        phone: '8015559406',
        source: 'WALK_IN',
        members: [],
        idempotencyKey: randomUUID(),
      }, actor)).rejects.toMatchObject({ message: 'Add at least one prospective member.' })

      await expect(createStaffHousehold(testDb.db, {
        firstName: 'Marta',
        phone: '8015559407',
        source: 'WALK_IN',
        members: [{ relationship: 'CHILD', firstName: 'Ana', programId: kids }],
        idempotencyKey: randomUUID(),
      }, actor)).rejects.toMatchObject({ message: 'Child age is required.' })

      await expect(createStaffHousehold(testDb.db, {
        firstName: 'Alex',
        phone: '8015559408',
        source: 'WALK_IN',
        members: [{ relationship: 'SELF', firstName: 'Alex', programId: 99999 }],
        idempotencyKey: randomUUID(),
      }, actor)).rejects.toMatchObject({ message: 'Program not found.' })
    } finally {
      await testDb.close()
    }
  })

  it('persists Source and Campaign on the header and rejects a missing campaign', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult } = await codes(testDb.db)
      const campaign = await createCampaign(testDb.db, { name: 'Fall Adult', slug: 'fall-adult-staff' })
      const created = await createStaffHousehold(testDb.db, {
        firstName: 'Pat',
        phone: '8015559409',
        source: 'FACEBOOK',
        campaignId: campaign.id,
        members: [{ relationship: 'SELF', firstName: 'Pat', programId: adult }],
        idempotencyKey: randomUUID(),
      }, await adminActor(testDb.db))
      expect(created.lead.source).toBe('FACEBOOK')
      expect(created.lead.campaignId).toBe(campaign.id)

      await expect(createStaffHousehold(testDb.db, {
        firstName: 'Pat',
        phone: '8015559410',
        source: 'FACEBOOK',
        campaignId: 99999,
        members: [{ relationship: 'SELF', firstName: 'Pat', programId: adult }],
        idempotencyKey: randomUUID(),
      }, await adminActor(testDb.db))).rejects.toMatchObject({ message: 'Campaign not found.' })
    } finally {
      await testDb.close()
    }
  })

  it('creates a matching-phone household separately and records possible duplicates without changing the original', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult, kids } = await codes(testDb.db)
      const actor = await adminActor(testDb.db)
      const existing = await createLead(testDb.db, {
        firstName: 'Emily',
        lastName: 'Coy',
        phone: '8015559411',
        email: 'emily@example.com',
        programId: adult,
        source: 'WALK_IN',
      }, actor)
      const existingLines = existing.lines.length

      const phoneMatch = await createStaffHousehold(testDb.db, {
        firstName: 'Morgan',
        lastName: 'Parent',
        phone: '8015559411',
        source: 'WALK_IN',
        members: [{ relationship: 'CHILD', firstName: 'Avery', age: 8, programId: kids }],
        idempotencyKey: randomUUID(),
      }, actor)
      expect(phoneMatch.lead.id).not.toBe(existing.id)
      expect(phoneMatch.lead.possibleDuplicateMatches).toHaveLength(1)
      expect(phoneMatch.lead.possibleDuplicateMatches[0]?.matchKind).toBe('PHONE')
      expect(phoneMatch.lead.possibleDuplicateMatches[0]?.matchedLeadId).toBe(existing.id)

      const emailMatch = await createStaffHousehold(testDb.db, {
        firstName: 'Other',
        lastName: 'Household',
        email: 'emily@example.com',
        source: 'WALK_IN',
        members: [{ relationship: 'SELF', firstName: 'Other', programId: adult }],
        idempotencyKey: randomUUID(),
      }, actor)
      expect(emailMatch.lead.id).not.toBe(existing.id)
      expect(emailMatch.lead.possibleDuplicateMatches[0]?.matchKind).toBe('EMAIL')

      const both = await createStaffHousehold(testDb.db, {
        firstName: 'Both',
        phone: '8015559411',
        email: 'emily@example.com',
        source: 'WALK_IN',
        members: [{ relationship: 'SELF', firstName: 'Both', programId: adult }],
        idempotencyKey: randomUUID(),
      }, actor)
      expect(both.lead.possibleDuplicateMatches.some(row => row.matchKind === 'BOTH' || row.matchedLeadId === existing.id)).toBe(true)

      const original = await getLead(testDb.db, existing.id)
      expect(original.lines).toHaveLength(existingLines)
      expect(original.firstName).toBe('Emily')
    } finally {
      await testDb.close()
    }
  })

  it('replays the same idempotency key and allows a new key with the same payload', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult } = await codes(testDb.db)
      const actor = await adminActor(testDb.db)
      const payload = {
        firstName: 'Retry',
        phone: '8015559412',
        source: 'WALK_IN' as const,
        members: [{ relationship: 'SELF' as const, firstName: 'Retry', programId: adult }],
      }
      const key = randomUUID()
      const first = await createStaffHousehold(testDb.db, { ...payload, idempotencyKey: key }, actor)
      const replay = await createStaffHousehold(testDb.db, { ...payload, idempotencyKey: key }, actor)
      expect(replay.replayed).toBe(true)
      expect(replay.lead.id).toBe(first.lead.id)
      expect((await testDb.db.select().from(leads).where(eq(leads.phone, '8015559412')))).toHaveLength(1)

      const second = await createStaffHousehold(testDb.db, { ...payload, idempotencyKey: randomUUID() }, actor)
      expect(second.lead.id).not.toBe(first.lead.id)
      expect((await testDb.db.select().from(leads).where(eq(leads.phone, '8015559412')))).toHaveLength(2)
    } finally {
      await testDb.close()
    }
  })

  it('rolls back a partial household and does not leave a completed idempotency row', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult, kids } = await codes(testDb.db)
      const original = leadLinesService.insertLeadLine.bind(leadLinesService)
      let calls = 0
      const spy = vi.spyOn(leadLinesService, 'insertLeadLine').mockImplementation(async (...args) => {
        calls += 1
        if (calls === 2) {
          throw new DomainError('forced household failure')
        }
        return original(...args)
      })
      const key = randomUUID()
      await expect(createStaffHousehold(testDb.db, {
        firstName: 'Fail',
        phone: '8015559413',
        source: 'WALK_IN',
        members: [
          { relationship: 'SELF', firstName: 'Fail', programId: adult },
          { relationship: 'CHILD', firstName: 'Kid', age: 8, programId: kids },
        ],
        idempotencyKey: key,
      }, await adminActor(testDb.db))).rejects.toBeInstanceOf(DomainError)
      expect(await testDb.db.select().from(leads).where(eq(leads.phone, '8015559413'))).toHaveLength(0)
      expect(await testDb.db.select().from(leadLines)).toHaveLength(0)
      expect(await testDb.db.select().from(publicBookingSubmissions).where(eq(publicBookingSubmissions.idempotencyKey, key))).toHaveLength(0)
      expect(await testDb.db.select().from(leadPossibleDuplicates)).toHaveLength(0)
      spy.mockRestore()
    } finally {
      await testDb.close()
    }
  })

  it('cannot create two households for concurrent requests with the same key', async () => {
    const testDb = await openTestDatabase()
    const second = createDb(testDb.url)
    try {
      await testDb.client.execute('PRAGMA journal_mode = WAL')
      await testDb.client.execute('PRAGMA busy_timeout = 2000')
      await second.client.execute('PRAGMA journal_mode = WAL')
      await second.client.execute('PRAGMA busy_timeout = 2000')
      const { adult } = await codes(testDb.db)
      const actor = await adminActor(testDb.db)
      const key = randomUUID()
      const payload = {
        firstName: 'Concurrent',
        phone: '8015559414',
        source: 'WALK_IN' as const,
        members: [{ relationship: 'SELF' as const, firstName: 'Concurrent', programId: adult }],
        idempotencyKey: key,
      }
      const [left, right] = await Promise.all([
        createStaffHousehold(testDb.db, payload, actor),
        createStaffHousehold(second.db, payload, actor),
      ])
      expect(new Set([left.lead.id, right.lead.id]).size).toBe(1)
      expect([left.replayed, right.replayed].filter(Boolean).length).toBeGreaterThanOrEqual(1)
      expect(await testDb.db.select().from(leads).where(eq(leads.phone, '8015559414'))).toHaveLength(1)
    } finally {
      second.client.close()
      await testDb.close()
    }
  }, 20_000)

  it('shows the new household in the Leads list with the same derived status as detail', async () => {
    const testDb = await openTestDatabase()
    try {
      const { adult } = await codes(testDb.db)
      const created = await createStaffHousehold(testDb.db, {
        firstName: 'Listed',
        phone: '8015559415',
        source: 'WALK_IN',
        members: [{ relationship: 'SELF', firstName: 'Listed', programId: adult }],
        idempotencyKey: randomUUID(),
      }, await adminActor(testDb.db))
      const listed = (await listLeads(testDb.db)).find(row => row.id === created.lead.id)
      expect(listed).toBeTruthy()
      expect(householdDisplayStatus(listed!).key).toBe(householdDisplayStatus(created.lead).key)
    } finally {
      await testDb.close()
    }
  })
})
