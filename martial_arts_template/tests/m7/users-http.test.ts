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
import { openTestDatabase } from '../helpers/db'
import listManagedUsers from '../../server/api/admin/users/index.get'
import createManagedUser from '../../server/api/admin/users/index.post'
import patchManagedUser from '../../server/api/admin/users/[id].patch'
import changeRole from '../../server/api/admin/users/[id]/role.post'
import resetPassword from '../../server/api/admin/users/[id]/password-reset.post'
import requirePasswordChange from '../../server/api/admin/users/[id]/require-password-change.post'
import deactivateUser from '../../server/api/admin/users/[id]/deactivate.post'
import activateUser from '../../server/api/admin/users/[id]/activate.post'
import revokeSessions from '../../server/api/admin/users/[id]/revoke-sessions.post'
import listSecurityEvents from '../../server/api/admin/security-events.get'

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
  const withActor = (handler: typeof listManagedUsers) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/admin/users', withActor(listManagedUsers))
  router.post('/api/admin/users', withActor(createManagedUser))
  router.patch('/api/admin/users/:id', withActor(patchManagedUser))
  router.post('/api/admin/users/:id/role', withActor(changeRole))
  router.post('/api/admin/users/:id/password-reset', withActor(resetPassword))
  router.post('/api/admin/users/:id/require-password-change', withActor(requirePasswordChange))
  router.post('/api/admin/users/:id/deactivate', withActor(deactivateUser))
  router.post('/api/admin/users/:id/activate', withActor(activateUser))
  router.post('/api/admin/users/:id/revoke-sessions', withActor(revokeSessions))
  router.get('/api/admin/security-events', withActor(listSecurityEvents))
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

describe('M7 user admin HTTP', () => {
  it('forbids STAFF and VIEWER and lets ADMIN manage users without leaking secrets', async () => {
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

      currentActor = null
      expect((await json(base, '/api/admin/users')).status).toBe(401)
      expect((await json(base, '/api/admin/security-events')).status).toBe(401)

      currentActor = viewer
      expect((await json(base, '/api/admin/users')).status).toBe(403)
      expect((await json(base, '/api/admin/security-events')).status).toBe(403)

      currentActor = staff
      expect((await json(base, '/api/admin/users')).status).toBe(403)
      expect((await json(base, '/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'No', email: 'no@example.com', role: 'STAFF' }),
      })).status).toBe(403)

      currentActor = admin
      const created = await json(base, '/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'New Staff', email: 'new.staff@example.com', role: 'STAFF' }),
      })
      expect(created.status).toBe(200)
      const createdUser = created.body as { id: number, email: string, mustChangePassword: boolean }
      expect(createdUser.email).toBe('new.staff@example.com')
      expect((created.body as { username: string }).username).toBe('new.staffexample.com')

      const named = await json(base, '/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Named', email: 'named@example.com', username: 'Named.Staff', role: 'STAFF' }),
      })
      expect(named.status).toBe(200)
      expect((named.body as { username: string }).username).toBe('named.staff')
      const patched = await json(base, `/api/admin/users/${(named.body as { id: number }).id}`, {
        method: 'PATCH',
        body: JSON.stringify({ username: 'named.staff2' }),
      })
      expect(patched.status).toBe(200)
      expect((patched.body as { username: string }).username).toBe('named.staff2')
      expect(createdUser.mustChangePassword).toBe(true)
      expect(JSON.stringify(created.body)).not.toMatch(/passwordHash|scrypt|Change1!|sessionVersion/)

      const listed = await json(base, '/api/admin/users?search=new.staff')
      expect(listed.status).toBe(200)
      expect(Array.isArray(listed.body)).toBe(true)
      expect((listed.body as { email: string }[]).some(user => user.email === 'new.staff@example.com')).toBe(true)

      expect((await json(base, `/api/admin/users/${createdUser.id}/password-reset`, {
        method: 'POST',
        body: JSON.stringify({}),
      })).status).toBe(400)

      const reset = await json(base, `/api/admin/users/${createdUser.id}/password-reset`, {
        method: 'POST',
        body: JSON.stringify({ password: 'StaffPass1!' }),
      })
      expect(reset.status).toBe(200)
      expect((reset.body as { mustChangePassword: boolean }).mustChangePassword).toBe(false)
      expect(JSON.stringify(reset.body)).not.toMatch(/passwordHash|scrypt|StaffPass1!|sessionVersion/)

      const required = await json(base, `/api/admin/users/${createdUser.id}/require-password-change`, {
        method: 'POST',
      })
      expect(required.status).toBe(200)
      expect((required.body as { mustChangePassword: boolean }).mustChangePassword).toBe(true)

      const selfDeactivate = await json(base, `/api/admin/users/${admin.id}/deactivate`, { method: 'POST' })
      expect(selfDeactivate.status).toBe(403)

      const events = await json(base, '/api/admin/security-events')
      expect(events.status).toBe(200)
      expect(JSON.stringify(events.body)).not.toMatch(/passwordHash|Change1!|scrypt/)
      const actions = (events.body as { action: string }[]).map(event => event.action)
      expect(actions).toContain('USER_CREATED')
      expect(actions).toContain('PASSWORD_RESET')
      expect(actions).toContain('PASSWORD_CHANGE_REQUIRED')
    } finally {
      await testDb.close()
    }
  })
})
