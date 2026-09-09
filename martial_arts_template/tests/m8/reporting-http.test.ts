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
import reportsGet from '../../server/api/reports.get'
import reportsExport from '../../server/api/reports/export.get'
import reportsMeta from '../../server/api/reports/meta.get'
import dashboardGet from '../../server/api/dashboard.get'
import metaStatus from '../../server/api/admin/meta/status.get'

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
  const withActor = (handler: typeof reportsGet) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/reports', withActor(reportsGet))
  router.get('/api/reports/export', withActor(reportsExport))
  router.get('/api/reports/meta', withActor(reportsMeta))
  router.get('/api/dashboard', withActor(dashboardGet))
  router.get('/api/admin/meta/status', withActor(metaStatus))
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

describe('M8 reporting HTTP RBAC', () => {
  it('lets STAFF read operational reports, ADMIN see financials, and blocks VIEWER', async () => {
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
      await createLead(testDb.db, {
        firstName: 'Alex',
        phone: '8015556299',
        programId: adult!.id,
        source: 'WALK_IN',
      })
      const base = await start(testDb)
      const qs = '?fromYmd=2026-08-01&toYmd=2026-08-31'

      currentActor = viewer
      expect((await json(base, `/api/reports${qs}`)).status).toBe(403)
      expect((await json(base, `/api/reports/export${qs}&kind=leads`)).status).toBe(403)
      const viewerDash = await json(base, '/api/dashboard')
      expect(viewerDash.status).toBe(200)
      expect((viewerDash.body as { newMrrCents: number | null }).newMrrCents).toBeNull()

      currentActor = staff
      const staffReport = await json(base, `/api/reports${qs}`)
      expect(staffReport.status).toBe(200)
      const staffBody = staffReport.body as { includeFinancial: boolean, conversions: Record<string, unknown> }
      expect(staffBody.includeFinancial).toBe(false)
      expect(staffBody.conversions.newMrrCents).toBeUndefined()
      const staffCsv = await json(base, `/api/reports/export${qs}&kind=conversions`)
      expect(staffCsv.status).toBe(200)
      expect(String(staffCsv.body)).not.toContain('monthlyCents')
      expect((await json(base, `/api/reports/meta${qs}`)).status).toBe(403)
      expect((await json(base, `/api/reports/export${qs}&kind=meta`)).status).toBe(403)
      expect((await json(base, '/api/admin/meta/status')).status).toBe(403)

      currentActor = admin
      const adminReport = await json(base, `/api/reports${qs}`)
      expect(adminReport.status).toBe(200)
      const adminBody = adminReport.body as { includeFinancial: boolean, conversions: { newMrrCents: number } }
      expect(adminBody.includeFinancial).toBe(true)
      expect(typeof adminBody.conversions.newMrrCents).toBe('number')
      const adminCsv = await json(base, `/api/reports/export${qs}&kind=conversions`)
      expect(String(adminCsv.body).includes('monthlyCents') || String(adminCsv.body) === '').toBe(true)
    } finally {
      await testDb.close()
    }
  })
})
