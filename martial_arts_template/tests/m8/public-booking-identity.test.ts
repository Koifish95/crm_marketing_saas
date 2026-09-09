import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setUseDbForTests, createDb } from '../../server/database'
import {
  followUpTasks,
  leadLines,
  leadPossibleDuplicates,
  leads,
  programs,
  publicBookingSubmissions,
  trials,
  users,
} from '../../server/database/schema'
import { DomainError } from '../../server/services/errors'
import * as leadService from '../../server/services/leads'
import { createLead, findDuplicateLeads, getLead, listLeads } from '../../server/services/leads'
import { listPublicSlots } from '../../server/services/availability'
import { createCampaign } from '../../server/services/campaigns'
import { bookPublicHousehold } from '../../server/services/public-trial'
import { publicHouseholdTrialSchema } from '../../shared/schemas/intro'
import type { SessionUser } from '../../server/services/authorization'
import { hashStaffPassword } from '../../server/services/password'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'
import publicTrialRoute from '../../server/api/public/trial.post'
import getLeadRoute from '../../server/api/leads/[id].get'
import listLeadsRoute from '../../server/api/leads/index.get'
import duplicatesRoute from '../../server/api/leads/duplicates.get'

const MONDAY_AFTERNOON_MDT = Date.parse('2026-08-31T21:00:00.000Z')
const EMILY_PHONE = '9876543210'

let currentActor: SessionUser | null = null
let server: Server | undefined

afterEach(async () => {
  currentActor = null
  setUseDbForTests(undefined)
  if (!server) {
    return
  }
  const closing = server
  server = undefined
  await new Promise<void>((resolve, reject) => {
    closing.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
})

async function adultSlot(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], startMinute = 18 * 60) {
  const slots = await listPublicSlots(db, { programCode: 'ADULT_BJJ', nowMs: MONDAY_AFTERNOON_MDT })
  return slots.find(slot => slot.date === '2026-08-31' && slot.startMinute === startMinute) ?? slots[0]!
}

async function kidsSlot(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], age: number) {
  const slots = await listPublicSlots(db, { programCode: 'KIDS_BJJ', age, nowMs: MONDAY_AFTERNOON_MDT })
  return slots[0]!
}

async function adultProgramId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [row] = await db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
  return row!.id
}

async function createEmily(db: Awaited<ReturnType<typeof openTestDatabase>>['db'], extra?: {
  email?: string
  phone?: string
}) {
  return createLead(db, {
    firstName: 'Emily',
    lastName: 'Coy',
    phone: extra?.phone ?? EMILY_PHONE,
    email: extra?.email,
    programId: await adultProgramId(db),
    source: 'WALK_IN',
  })
}

function steveMembers(
  adult: { id: string },
  child: { id: string },
) {
  return [{
    relationship: 'CHILD' as const,
    firstName: 'Devan',
    lastName: 'Parkinson',
    programCode: 'ADULT_BJJ' as const,
    slotId: adult.id,
  }, {
    relationship: 'CHILD' as const,
    firstName: 'Rosie',
    lastName: 'Parkinson',
    age: 4,
    programCode: 'KIDS_BJJ' as const,
    slotId: child.id,
  }]
}

async function bookSteve(
  db: Awaited<ReturnType<typeof openTestDatabase>>['db'],
  options: {
    phone?: string
    email?: string
    idempotencyKey?: string
    source?: string
    trackingCode?: string
    utmSource?: string
  } = {},
) {
  const adult = await adultSlot(db)
  const child = await kidsSlot(db, 4)
  return bookPublicHousehold(db, {
    firstName: 'Steve',
    lastName: 'Parkinson',
    phone: options.phone ?? EMILY_PHONE,
    email: options.email,
    members: steveMembers(adult, child),
    idempotencyKey: options.idempotencyKey ?? randomUUID(),
    source: options.source,
    trackingCode: options.trackingCode,
    utmSource: options.utmSource,
  }, { nowMs: MONDAY_AFTERNOON_MDT })
}

function householdSnapshot(lead: Awaited<ReturnType<typeof getLead>>) {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    email: lead.email,
    status: lead.status,
    lineIds: (lead.lines ?? []).map(line => line.id).sort((a, b) => a - b),
    lineNames: (lead.lines ?? []).map(line => line.firstName).sort(),
    trialIds: (lead.trials ?? []).map(trial => trial.id).sort((a, b) => a - b),
    taskIds: (lead.followUpTasks ?? []).map(task => task.id).sort((a, b) => a - b),
  }
}

async function startHttp(testDb: Awaited<ReturnType<typeof openTestDatabase>>) {
  setUseDbForTests(testDb.db)
  const app = createApp()
  const router = createRouter()
  const withActor = (handler: typeof getLeadRoute) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.post('/api/public/trial', eventHandler(async event => publicTrialRoute(event)))
  router.get('/api/leads', withActor(listLeadsRoute))
  router.get('/api/leads/duplicates', withActor(duplicatesRoute))
  router.get('/api/leads/:id', withActor(getLeadRoute))
  app.use(router)
  server = createServer(toNodeListener(app))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return `http://127.0.0.1:${port}`
}

async function json(base: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  try {
    return { status: response.status, body: JSON.parse(text) as Record<string, unknown> }
  } catch {
    return { status: response.status, body: text }
  }
}

function asUser(row: { id: number, email: string, displayName: string, role: string }): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as SessionUser['role'],
    mustChangePassword: false,
  }
}

describe('M8 public booking identity', () => {
  it('creates a new household for a new phone and email', async () => {
    const testDb = await openTestDatabase()
    try {
      const result = await bookSteve(testDb.db, { phone: '8015557001', email: 'steve-new@example.com' })
      expect(result.replayed).toBe(false)
      expect(result.lead.firstName).toBe('Steve')
      expect(result.lead.lastName).toBe('Parkinson')
      expect(result.lead.possibleDuplicateMatches).toHaveLength(0)
      const headers = await testDb.db.select().from(leads).where(eq(leads.phone, '8015557001'))
      expect(headers).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('creates Steve Parkinson separately when the phone matches Emily Coy', async () => {
    const testDb = await openTestDatabase()
    try {
      const emily = await createEmily(testDb.db)
      const before = householdSnapshot(await getLead(testDb.db, emily.id))
      const key = randomUUID()
      const first = await bookSteve(testDb.db, { idempotencyKey: key })
      expect(first.lead.id).not.toBe(emily.id)
      expect(first.lead.firstName).toBe('Steve')
      expect(first.lead.lastName).toBe('Parkinson')
      expect(first.lead.lines?.map(line => line.firstName).sort()).toEqual(['Devan', 'Rosie'])
      expect(first.lead.lines?.every(line => line.leadId === first.lead.id)).toBe(true)
      expect(first.lead.lines?.some(line => line.relationship === 'SELF')).toBe(false)
      const devan = first.lead.lines?.find(line => line.firstName === 'Devan')
      const rosie = first.lead.lines?.find(line => line.firstName === 'Rosie')
      expect(devan?.trials).toHaveLength(1)
      expect(rosie?.trials).toHaveLength(1)
      expect(devan?.program?.code).toBe('ADULT_BJJ')
      expect(rosie?.program?.code).toBe('KIDS_BJJ')
      expect(first.lead.possibleDuplicateMatches).toHaveLength(1)
      expect(first.lead.possibleDuplicateMatches?.[0]?.matchKind).toBe('PHONE')
      expect(first.lead.possibleDuplicateMatches?.[0]?.matchedLeadId).toBe(emily.id)
      expect(first.lead.possibleDuplicateMatches?.[0]?.matchedDisplayName).toBe('Emily Coy')
      expect(first.lead.possibleDuplicateMatches?.[0]?.detectedAt).toBeTruthy()
      expect(first.confirmation.householdContactName).toBe('Steve Parkinson')
      expect(first.confirmation).not.toHaveProperty('leadId')
      expect(first.confirmation.people.map(person => person.firstName).sort()).toEqual(['Devan', 'Rosie'])
      expect(JSON.stringify(first.confirmation)).not.toContain('Emily')
      expect(JSON.stringify(first.confirmation).toLowerCase()).not.toContain('duplicate')
      expect(JSON.stringify(first.confirmation).toLowerCase()).not.toContain('replayed')
      expect(JSON.stringify(first.confirmation).toLowerCase()).not.toContain('reused')
      const afterEmily = householdSnapshot(await getLead(testDb.db, emily.id))
      expect(afterEmily).toEqual(before)
      const pending = (first.lead.followUpTasks ?? []).filter(task => task.status === 'PENDING' && task.purpose === 'INITIAL_SCHEDULE')
      expect(pending).toHaveLength(1)

      const retry = await bookSteve(testDb.db, { idempotencyKey: key })
      expect(retry.replayed).toBe(true)
      expect(retry.lead.id).toBe(first.lead.id)
      const steveRows = await testDb.db.select().from(leads).where(eq(leads.firstName, 'Steve'))
      expect(steveRows).toHaveLength(1)
      expect(await testDb.db.select().from(leadLines).where(eq(leadLines.leadId, first.lead.id))).toHaveLength(2)
      expect(await testDb.db.select().from(trials).where(eq(trials.leadId, first.lead.id))).toHaveLength(2)
      expect(await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.leadId, first.lead.id))).toHaveLength(1)

      const second = await bookSteve(testDb.db, { idempotencyKey: randomUUID() })
      expect(second.lead.id).not.toBe(first.lead.id)
      expect(second.lead.id).not.toBe(emily.id)
      expect(second.lead.possibleDuplicateMatches?.some(match => match.matchedLeadId === emily.id)).toBe(true)
      expect(householdSnapshot(await getLead(testDb.db, emily.id))).toEqual(before)
    } finally {
      await testDb.close()
    }
  })

  it('creates a separate household when only email matches', async () => {
    const testDb = await openTestDatabase()
    try {
      const emily = await createEmily(testDb.db, { phone: '8015557002', email: 'shared@example.com' })
      const result = await bookSteve(testDb.db, { phone: '8015557003', email: 'Shared@example.com' })
      expect(result.lead.id).not.toBe(emily.id)
      expect(result.lead.possibleDuplicateMatches).toHaveLength(1)
      expect(result.lead.possibleDuplicateMatches?.[0]?.matchKind).toBe('EMAIL')
      expect(result.lead.possibleDuplicateMatches?.[0]?.matchedLeadId).toBe(emily.id)
    } finally {
      await testDb.close()
    }
  })

  it('records both phone and email matches, including multiple households', async () => {
    const testDb = await openTestDatabase()
    try {
      const emily = await createEmily(testDb.db, { email: 'family@example.com' })
      const other = await createLead(testDb.db, {
        firstName: 'Other',
        lastName: 'Match',
        phone: EMILY_PHONE,
        email: 'family@example.com',
        programId: await adultProgramId(testDb.db),
        source: 'PHONE',
      })
      const result = await bookSteve(testDb.db, { email: 'family@example.com' })
      expect(result.lead.id).not.toBe(emily.id)
      expect(result.lead.id).not.toBe(other.id)
      const kinds = result.lead.possibleDuplicateMatches?.map(match => `${match.matchedLeadId}:${match.matchKind}`).sort()
      expect(kinds).toEqual([
        `${emily.id}:BOTH`,
        `${other.id}:BOTH`,
      ].sort())
    } finally {
      await testDb.close()
    }
  })

  it('keeps one-SELF enforcement and allows a guardian-only household', async () => {
    const testDb = await openTestDatabase()
    try {
      const adult = await adultSlot(testDb.db)
      expect(publicHouseholdTrialSchema.safeParse({
        firstName: 'Jordan',
        lastName: 'Smith',
        phone: '8015557004',
        idempotencyKey: randomUUID(),
        members: [{
          relationship: 'SELF',
          firstName: 'Jordan',
          lastName: 'Smith',
          programCode: 'ADULT_BJJ',
          slotId: adult.id,
        }, {
          relationship: 'SELF',
          firstName: 'Jordan',
          lastName: 'Smith',
          programCode: 'ADULT_BJJ',
          slotId: adult.id,
        }],
      }).success).toBe(false)

      const child = await kidsSlot(testDb.db, 6)
      const guardianOnly = await bookPublicHousehold(testDb.db, {
        firstName: 'Kim',
        lastName: 'Guardian',
        phone: '8015557005',
        members: [{
          relationship: 'CHILD',
          firstName: 'Riley',
          age: 6,
          programCode: 'KIDS_BJJ',
          slotId: child.id,
        }],
        idempotencyKey: randomUUID(),
      }, { nowMs: MONDAY_AFTERNOON_MDT })
      expect(guardianOnly.lead.lines).toHaveLength(1)
      expect(guardianOnly.lead.lines?.[0]?.relationship).toBe('CHILD')
      expect(guardianOnly.lead.lines?.some(line => line.relationship === 'SELF')).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('keeps public attribution and household follow-up consolidation', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'Identity Attribution' })
      const link = campaign.trackingLinks[0]!
      const result = await bookSteve(testDb.db, {
        phone: '8015557006',
        trackingCode: link.code,
        utmSource: 'meta',
        source: 'instagram',
      })
      expect(result.lead.campaignId).toBe(campaign.id)
      expect(result.lead.campaignTrackingLinkId).toBe(link.id)
      expect(result.lead.utmSource).toBe('meta')
      expect(result.lead.source).toBe('INSTAGRAM')
      const initial = (result.lead.followUpTasks ?? []).filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')
      expect(initial).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('leaves no household or successful idempotency row after a transaction failure', async () => {
    const testDb = await openTestDatabase()
    try {
      const original = leadService.createTrial.bind(leadService)
      let calls = 0
      const spy = vi.spyOn(leadService, 'createTrial').mockImplementation(async (...args) => {
        calls += 1
        if (calls === 2) {
          throw new DomainError('forced booking failure')
        }
        return original(...args)
      })
      const key = randomUUID()
      await expect(bookSteve(testDb.db, { phone: '8015557007', idempotencyKey: key })).rejects.toBeInstanceOf(DomainError)
      expect(await testDb.db.select().from(leads).where(eq(leads.phone, '8015557007'))).toHaveLength(0)
      expect(await testDb.db.select().from(publicBookingSubmissions)).toHaveLength(0)
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
      const key = randomUUID()
      const [left, right] = await Promise.all([
        bookSteve(testDb.db, { phone: '8015557008', idempotencyKey: key }),
        bookSteve(second.db, { phone: '8015557008', idempotencyKey: key }),
      ])
      expect(new Set([left.lead.id, right.lead.id]).size).toBe(1)
      expect([left.replayed, right.replayed].filter(Boolean).length).toBeGreaterThanOrEqual(1)
      const rows = await testDb.db.select().from(leads).where(eq(leads.phone, '8015557008'))
      expect(rows).toHaveLength(1)
      expect(await testDb.db.select().from(publicBookingSubmissions)).toHaveLength(1)
    } finally {
      second.client.close()
      await testDb.close()
    }
  }, 20_000)

  it('lets ADMIN and STAFF see the warning, hides it from public confirmation, and keeps VIEWER off CRM', async () => {
    const testDb = await openTestDatabase()
    try {
      const emily = await createEmily(testDb.db)
      const now = new Date(utcNowMs())
      await testDb.db.insert(users).values({
        email: 'identity-staff@local',
        username: 'identity-staff',
        displayName: 'Identity Staff',
        role: 'STAFF',
        active: true,
        passwordHash: await hashStaffPassword('staff-password'),
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      })
      await testDb.db.insert(users).values({
        email: 'identity-viewer@local',
        username: 'identity-viewer',
        displayName: 'Identity Viewer',
        role: 'VIEWER',
        active: true,
        passwordHash: await hashStaffPassword('viewer-password'),
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      })
      const [adminRow] = await testDb.db.select().from(users).where(eq(users.username, 'admin'))
      const [staffRow] = await testDb.db.select().from(users).where(eq(users.username, 'identity-staff'))
      const [viewerRow] = await testDb.db.select().from(users).where(eq(users.username, 'identity-viewer'))
      const adultSlots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ' })
      const childSlots = await listPublicSlots(testDb.db, { programCode: 'KIDS_BJJ', age: 4 })
      const adult = adultSlots[0]!
      const child = childSlots[0]!
      const key = randomUUID()
      const base = await startHttp(testDb)
      const booked = await json(base, '/api/public/trial', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Steve',
          lastName: 'Parkinson',
          phone: EMILY_PHONE,
          idempotencyKey: key,
          members: steveMembers(adult, child),
        }),
      })
      expect(booked.status, JSON.stringify(booked.body)).toBe(200)
      const payload = JSON.stringify(booked.body)
      expect(payload).not.toContain('Emily')
      expect(payload.toLowerCase()).not.toContain('reused')
      expect(payload.toLowerCase()).not.toContain('duplicate')
      expect(payload.toLowerCase()).not.toContain('replayed')
      const confirmation = booked.body.confirmation as { householdContactName: string, people: Array<{ firstName: string }> }
      expect(confirmation.householdContactName).toBe('Steve Parkinson')
      expect(confirmation.people.map(person => person.firstName).sort()).toEqual(['Devan', 'Rosie'])
      expect(booked.body).not.toHaveProperty('reused')

      const listed = await listLeads(testDb.db)
      const steve = listed.find(row => row.firstName === 'Steve' && row.lastName === 'Parkinson')!
      expect(steve.possibleDuplicateMatches?.length).toBeGreaterThan(0)

      currentActor = asUser(adminRow!)
      const adminLead = await json(base, `/api/leads/${steve.id}`)
      expect(adminLead.status).toBe(200)
      const adminBody = adminLead.body as { possibleDuplicateMatches: Array<{ matchedDisplayName: string }> }
      expect(adminBody.possibleDuplicateMatches[0]?.matchedDisplayName).toBe('Emily Coy')

      currentActor = asUser(staffRow!)
      expect((await json(base, `/api/leads/${steve.id}`)).status).toBe(200)
      const staffList = await json(base, '/api/leads')
      expect(staffList.status).toBe(200)
      const staffDupes = await json(base, `/api/leads/duplicates?phone=${EMILY_PHONE}`)
      expect(staffDupes.status).toBe(200)
      expect(Array.isArray(staffDupes.body)).toBe(true)

      currentActor = asUser(viewerRow!)
      expect((await json(base, `/api/leads/${steve.id}`)).status).toBe(403)
      expect((await json(base, '/api/leads')).status).toBe(403)
      expect((await json(base, `/api/leads/duplicates?phone=${EMILY_PHONE}`)).status).toBe(403)

      const stillStaffWarning = await findDuplicateLeads(testDb.db, { phone: EMILY_PHONE, excludeId: emily.id })
      expect(stillStaffWarning.some(row => row.id === steve.id)).toBe(true)
    } finally {
      await testDb.close()
    }
  })
})
