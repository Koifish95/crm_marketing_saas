import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { programs, users } from '../../server/database/schema'
import { hashStaffPassword } from '../../server/services/password'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { createLead } from '../../server/services/leads'
import { openTestDatabase } from '../helpers/db'
import listOfferings from '../../server/api/membership-offerings.get'
import createOffering from '../../server/api/admin/membership-offerings/index.post'
import patchOffering from '../../server/api/admin/membership-offerings/[id].patch'
import listSources from '../../server/api/lead-sources.get'
import createSource from '../../server/api/admin/lead-sources/index.post'
import listLostReasons from '../../server/api/lost-reasons.get'
import createLostReason from '../../server/api/admin/lost-reasons/index.post'
import listPricing from '../../server/api/household-pricing-rules.get'
import createPricing from '../../server/api/admin/household-pricing-rules/index.post'
import patchProgram from '../../server/api/admin/programs/[id].patch'
import createProgram from '../../server/api/admin/programs/index.post'
import forecastGet from '../../server/api/leads/[id]/forecast.get'

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
  const withActor = (handler: typeof listOfferings) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/membership-offerings', withActor(listOfferings))
  router.post('/api/admin/membership-offerings', withActor(createOffering))
  router.patch('/api/admin/membership-offerings/:id', withActor(patchOffering))
  router.get('/api/lead-sources', withActor(listSources))
  router.post('/api/admin/lead-sources', withActor(createSource))
  router.get('/api/lost-reasons', withActor(listLostReasons))
  router.post('/api/admin/lost-reasons', withActor(createLostReason))
  router.get('/api/household-pricing-rules', withActor(listPricing))
  router.post('/api/admin/household-pricing-rules', withActor(createPricing))
  router.post('/api/admin/programs', withActor(createProgram))
  router.patch('/api/admin/programs/:id', withActor(patchProgram))
  router.get('/api/leads/:id/forecast', withActor(forecastGet))
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

function asUser(row: { id: number, email: string, displayName: string, role: string, mustChangePassword?: boolean }): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as SessionUser['role'],
    mustChangePassword: Boolean(row.mustChangePassword),
  }
}

describe('M8 catalog HTTP RBAC', () => {
  it('lets STAFF read catalog and forecast, and restricts writes to ADMIN', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const [adminRow] = await testDb.db.select().from(users)
      await testDb.db.insert(users).values([
        {
          email: 'viewer@local',
          username: 'viewer',
          displayName: 'Viewer',
          role: 'VIEWER',
          active: true,
          passwordHash: await hashStaffPassword('viewer-password'),
          mustChangePassword: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          email: 'staff@local',
          username: 'staff',
          displayName: 'Staff',
          role: 'STAFF',
          active: true,
          passwordHash: await hashStaffPassword('staff-password'),
          mustChangePassword: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      const [viewerRow] = await testDb.db.select().from(users).where(eq(users.username, 'viewer'))
      const [staffRow] = await testDb.db.select().from(users).where(eq(users.username, 'staff'))
      const admin = asUser(adminRow!)
      const viewer = asUser(viewerRow!)
      const staff = asUser(staffRow!)
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      const lead = await createLead(testDb.db, {
        firstName: 'Alex',
        phone: '8015553199',
        programId: adult!.id,
        source: 'WALK_IN',
      })
      const base = await start(testDb)

      currentActor = viewer
      expect((await json(base, '/api/membership-offerings')).status).toBe(403)
      expect((await json(base, `/api/leads/${lead.id}/forecast`)).status).toBe(403)

      currentActor = staff
      expect((await json(base, '/api/membership-offerings')).status).toBe(200)
      expect((await json(base, '/api/lead-sources')).status).toBe(200)
      expect((await json(base, '/api/lost-reasons')).status).toBe(200)
      expect((await json(base, '/api/household-pricing-rules')).status).toBe(200)
      expect((await json(base, `/api/leads/${lead.id}/forecast`)).status).toBe(200)
      expect((await json(base, '/api/admin/membership-offerings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Staff should not create this',
          programId: adult!.id,
          monthlyCents: 10000,
        }),
      })).status).toBe(403)
      expect((await json(base, '/api/membership-offerings?includeInactive=true')).status).toBe(403)

      currentActor = admin
      const created = await json(base, '/api/admin/membership-offerings', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Admin extra offering',
          programId: adult!.id,
          monthlyCents: 12000,
          enrollmentCents: 2500,
        }),
      })
      expect(created.status).toBe(200)
      const createdBody = created.body as { id: number, monthlyCents: number }
      expect(createdBody.monthlyCents).toBe(12000)
      const patched = await json(base, `/api/admin/membership-offerings/${createdBody.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Admin extra offering',
          programId: adult!.id,
          monthlyCents: 12100,
          active: false,
        }),
      })
      expect(patched.status).toBe(200)
      const listed = await json(base, '/api/membership-offerings?includeInactive=true')
      expect(listed.status).toBe(200)
      const listedBody = listed.body as Array<{ id: number, active: boolean }>
      expect(listedBody.find(row => row.id === createdBody.id)?.active).toBe(false)

      const programPatch = await json(base, `/api/admin/programs/${adult!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Adult Jiu-Jitsu' }),
      })
      expect(programPatch.status).toBe(200)
    } finally {
      await testDb.close()
    }
  })
})
