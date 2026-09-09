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
import { PASSWORD_CHANGE_REQUIRED_MESSAGE } from '../../server/services/authorization'
import { createManagedUser } from '../../server/services/users'
import { openTestDatabase } from '../helpers/db'
import dashboard from '../../server/api/dashboard.get'
import listLeads from '../../server/api/leads/index.get'
import listTasks from '../../server/api/follow-up-tasks/index.get'
import listPrograms from '../../server/api/programs.get'
import listAssignmentUsers from '../../server/api/users.get'
import listAvailability from '../../server/api/intro-availability/index.get'

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
  const withActor = (handler: typeof dashboard) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/dashboard', withActor(dashboard))
  router.get('/api/leads', withActor(listLeads))
  router.get('/api/follow-up-tasks', withActor(listTasks))
  router.get('/api/programs', withActor(listPrograms))
  router.get('/api/users', withActor(listAssignmentUsers))
  router.get('/api/intro-availability', withActor(listAvailability))
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

describe('M7 RBAC and forced password change HTTP', () => {
  it('lets VIEWER read the dashboard and denies CRM and availability APIs', async () => {
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
      const base = await start(testDb)

      currentActor = viewer
      expect((await json(base, '/api/dashboard')).status).toBe(200)
      expect((await json(base, '/api/leads')).status).toBe(403)
      expect((await json(base, '/api/follow-up-tasks')).status).toBe(403)
      expect((await json(base, '/api/programs')).status).toBe(403)
      expect((await json(base, '/api/users')).status).toBe(403)
      expect((await json(base, '/api/intro-availability')).status).toBe(403)

      currentActor = staff
      expect((await json(base, '/api/dashboard')).status).toBe(200)
      expect((await json(base, '/api/leads')).status).toBe(200)
      expect((await json(base, '/api/follow-up-tasks')).status).toBe(200)
      expect((await json(base, '/api/programs')).status).toBe(200)
      expect((await json(base, '/api/users')).status).toBe(200)
      expect((await json(base, '/api/intro-availability')).status).toBe(403)

      currentActor = admin
      expect((await json(base, '/api/intro-availability')).status).toBe(200)
    } finally {
      await testDb.close()
    }
  })

  it('blocks dashboard and CRM APIs while mustChangePassword is set', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createManagedUser(testDb.db, {
        displayName: 'Forced',
        email: 'forced@example.com',
        role: 'STAFF',
        password: 'TempPass1!',
      })
      const actor = asUser({ ...created, mustChangePassword: true })
      const base = await start(testDb)
      currentActor = actor

      const blockedDashboard = await json(base, '/api/dashboard')
      expect(blockedDashboard.status).toBe(403)
      const blockedBody = blockedDashboard.body as { message?: string, statusMessage?: string }
      expect(blockedBody.message || blockedBody.statusMessage).toBe(PASSWORD_CHANGE_REQUIRED_MESSAGE)
      expect((await json(base, '/api/leads')).status).toBe(403)
    } finally {
      await testDb.close()
    }
  })
})
