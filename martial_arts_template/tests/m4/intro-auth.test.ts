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
import { openTestDatabase } from '../helpers/db'
import listRules from '../../server/api/intro-availability/index.get'
import createRule from '../../server/api/intro-availability/index.post'
import patchRule from '../../server/api/intro-availability/[id].patch'
import createException from '../../server/api/intro-exceptions/index.post'
import deleteException from '../../server/api/intro-exceptions/[id].delete'

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
  router.get('/api/intro-availability', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return listRules(event)
  }))
  router.post('/api/intro-availability', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return createRule(event)
  }))
  router.patch('/api/intro-availability/:id', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return patchRule(event)
  }))
  router.post('/api/intro-exceptions', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return createException(event)
  }))
  router.delete('/api/intro-exceptions/:id', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return deleteException(event)
  }))
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

describe('M4 intro availability HTTP authorization', () => {
  it('rejects public, VIEWER, and STAFF writes and allows ADMIN', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const [adminRow] = await testDb.db.select().from(users)
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      await testDb.db.insert(users).values([
        {
          email: 'viewer@local',
          username: 'viewer',
          displayName: 'Viewer',
          role: 'VIEWER',
          active: true,
          passwordHash: await hashStaffPassword('viewer-password'),
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
          createdAt: now,
          updatedAt: now,
        },
      ])
      const [viewerRow] = await testDb.db.select().from(users).where(eq(users.username, 'viewer'))
      const [staffRow] = await testDb.db.select().from(users).where(eq(users.username, 'staff'))

      const admin: SessionUser = { id: adminRow!.id, email: adminRow!.email, displayName: adminRow!.displayName, role: 'ADMIN' }
      const viewer: SessionUser = { id: viewerRow!.id, email: viewerRow!.email, displayName: viewerRow!.displayName, role: 'VIEWER' }
      const staff: SessionUser = { id: staffRow!.id, email: staffRow!.email, displayName: staffRow!.displayName, role: 'STAFF' }

      const payload = {
        programId: adult!.id,
        weekday: 0,
        startMinute: 10 * 60,
        name: 'Sunday HTTP intro',
        enabled: true,
      }

      const base = await start(testDb)

      currentActor = null
      expect((await json(base, '/api/intro-availability')).status).toBe(401)
      expect((await json(base, '/api/intro-availability', { method: 'POST', body: JSON.stringify(payload) })).status).toBe(401)

      currentActor = viewer
      expect((await json(base, '/api/intro-availability')).status).toBe(403)
      expect((await json(base, '/api/intro-availability', { method: 'POST', body: JSON.stringify(payload) })).status).toBe(403)

      currentActor = staff
      expect((await json(base, '/api/intro-availability')).status).toBe(403)
      expect((await json(base, '/api/intro-availability', { method: 'POST', body: JSON.stringify(payload) })).status).toBe(403)
      expect((await json(base, '/api/intro-availability/1', { method: 'PATCH', body: JSON.stringify({ enabled: false }) })).status).toBe(403)
      expect((await json(base, '/api/intro-exceptions', {
        method: 'POST',
        body: JSON.stringify({ onDate: '2026-09-01', kind: 'CLOSE_DATE' }),
      })).status).toBe(403)
      expect((await json(base, '/api/intro-exceptions/1', { method: 'DELETE' })).status).toBe(403)

      currentActor = admin
      const adminPost = await json(base, '/api/intro-availability', { method: 'POST', body: JSON.stringify(payload) })
      expect(adminPost.status).toBe(200)
      const created = adminPost.body as { id: number, name: string, enabled: boolean }
      expect(created.name).toBe('Sunday HTTP intro')
      const adminPatch = await json(base, `/api/intro-availability/${created.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false, name: 'Sunday HTTP intro (off)' }),
      })
      expect(adminPatch.status).toBe(200)
      expect((adminPatch.body as { enabled: boolean, name: string }).enabled).toBe(false)
      expect((adminPatch.body as { name: string }).name).toBe('Sunday HTTP intro (off)')
      const adminException = await json(base, '/api/intro-exceptions', {
        method: 'POST',
        body: JSON.stringify({ onDate: '2026-09-01', kind: 'CLOSE_DATE' }),
      })
      expect(adminException.status).toBe(200)
      const exception = adminException.body as { id: number }
      const adminDelete = await json(base, `/api/intro-exceptions/${exception.id}`, { method: 'DELETE' })
      expect(adminDelete.status).toBe(200)
    } finally {
      await testDb.close()
    }
  })
})
