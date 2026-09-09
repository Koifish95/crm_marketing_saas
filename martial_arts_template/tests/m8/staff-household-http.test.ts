import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { users } from '../../server/database/schema'
import { hashStaffPassword } from '../../server/services/password'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { createLead } from '../../server/services/leads'
import { openTestDatabase } from '../helpers/db'
import { programId } from './helpers/scenarios'
import createLeadRoute from '../../server/api/leads/index.post'
import getLeadRoute from '../../server/api/leads/[id].get'
import listLeadsRoute from '../../server/api/leads/index.get'
import duplicatesRoute from '../../server/api/leads/duplicates.get'
import outcomeRoute from '../../server/api/trials/[id]/outcome.post'

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

async function start(testDb: Awaited<ReturnType<typeof openTestDatabase>>) {
  setUseDbForTests(testDb.db)
  const app = createApp()
  const router = createRouter()
  const withActor = (handler: typeof createLeadRoute) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.post('/api/leads', withActor(createLeadRoute))
  router.get('/api/leads', withActor(listLeadsRoute))
  router.get('/api/leads/:id', withActor(getLeadRoute))
  router.get('/api/leads/duplicates', withActor(duplicatesRoute))
  router.post('/api/trials/:id/outcome', withActor(outcomeRoute))
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
    return { status: response.status, body: JSON.parse(text) as unknown }
  } catch {
    return { status: response.status, body: text }
  }
}

async function actorFor(testDb: Awaited<ReturnType<typeof openTestDatabase>>, username: string): Promise<SessionUser> {
  const [row] = await testDb.db.select().from(users).where(eq(users.username, username))
  return {
    id: row!.id,
    email: row!.email,
    displayName: row!.displayName,
    role: row!.role,
    mustChangePassword: false,
  }
}

async function insertRoles(testDb: Awaited<ReturnType<typeof openTestDatabase>>) {
  const now = new Date(utcNowMs())
  await testDb.db.insert(users).values([{
    email: 'hh-staff@local',
    username: 'hh-staff',
    displayName: 'HH Staff',
    role: 'STAFF',
    active: true,
    passwordHash: await hashStaffPassword('staff-password'),
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  }, {
    email: 'hh-viewer@local',
    username: 'hh-viewer',
    displayName: 'HH Viewer',
    role: 'VIEWER',
    active: true,
    passwordHash: await hashStaffPassword('viewer-password'),
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  }])
}

describe('staff household create HTTP', () => {
  it('lets STAFF create a household, blocks VIEWER and unauthenticated, and returns the new household id', async () => {
    const testDb = await openTestDatabase()
    try {
      await insertRoles(testDb)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const base = await start(testDb)
      const body = {
        firstName: 'Jordan',
        lastName: 'Family',
        phone: '8015559501',
        source: 'WALK_IN',
        notes: 'Front desk walk-in.',
        idempotencyKey: randomUUID(),
        members: [
          { relationship: 'SELF', firstName: 'Jordan', programId: adult },
          { relationship: 'CHILD', firstName: 'Riley', age: 8, programId: kids },
        ],
      }

      currentActor = null
      expect((await json(base, '/api/leads', { method: 'POST', body: JSON.stringify(body) })).status).toBe(401)

      currentActor = await actorFor(testDb, 'hh-viewer')
      expect((await json(base, '/api/leads', { method: 'POST', body: JSON.stringify(body) })).status).toBe(403)
      expect((await json(base, '/api/leads/duplicates?phone=8015559501')).status).toBe(403)

      currentActor = await actorFor(testDb, 'hh-staff')
      const created = await json(base, '/api/leads', { method: 'POST', body: JSON.stringify(body) })
      expect(created.status).toBe(200)
      const lead = created.body as { id: number, lines: Array<{ firstName: string, relationship: string }>, notes: Array<{ body: string }> }
      expect(lead.id).toBeGreaterThan(0)
      expect(lead.lines).toHaveLength(2)
      expect(lead.notes[0]?.body).toBe('Front desk walk-in.')

      const listed = await json(base, '/api/leads')
      expect(listed.status).toBe(200)
      expect((listed.body as Array<{ id: number }>).some(row => row.id === lead.id)).toBe(true)

      const detail = await json(base, `/api/leads/${lead.id}`)
      expect(detail.status).toBe(200)
      expect((detail.body as { lines: unknown[] }).lines).toHaveLength(2)
    } finally {
      await testDb.close()
    }
  })

  it('keeps legacy one-line create working and does not give VIEWER duplicate lookup access', async () => {
    const testDb = await openTestDatabase()
    try {
      await insertRoles(testDb)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const base = await start(testDb)
      currentActor = await actorFor(testDb, 'hh-staff')
      const created = await json(base, '/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Legacy',
          phone: '8015559502',
          programId: adult,
          source: 'WALK_IN',
        }),
      })
      expect(created.status).toBe(200)
      expect((created.body as { lines: unknown[] }).lines).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('returns duplicate matches to STAFF without blocking a new household create', async () => {
    const testDb = await openTestDatabase()
    try {
      await insertRoles(testDb)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      await createLead(testDb.db, {
        firstName: 'Emily',
        lastName: 'Coy',
        phone: '8015559503',
        email: 'emily.staff@example.com',
        programId: adult,
        source: 'WALK_IN',
      })
      const base = await start(testDb)
      currentActor = await actorFor(testDb, 'hh-staff')
      const lookup = await json(base, '/api/leads/duplicates?phone=8015559503&email=emily.staff@example.com')
      expect(lookup.status).toBe(200)
      const matches = lookup.body as Array<{ firstName: string, matchKind?: string }>
      expect(matches.some(row => row.firstName === 'Emily' && (row.matchKind === 'BOTH' || row.matchKind === 'PHONE'))).toBe(true)

      const created = await json(base, '/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Morgan',
          phone: '8015559503',
          source: 'WALK_IN',
          idempotencyKey: randomUUID(),
          members: [{ relationship: 'SELF', firstName: 'Morgan', programId: adult }],
        }),
      })
      expect(created.status).toBe(200)
      const lead = created.body as { id: number, possibleDuplicateMatches: Array<{ matchKind: string }> }
      expect(lead.possibleDuplicateMatches.length).toBeGreaterThan(0)
    } finally {
      await testDb.close()
    }
  })
})
