import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { securityEvents, users } from '../../server/database/schema'
import { hashStaffPassword } from '../../server/services/password'
import { processControl } from '../../server/services/system'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { openTestDatabase } from '../helpers/db'
import statusRoute from '../../server/api/admin/system/status.get'
import shutdownRoute from '../../server/api/admin/system/shutdown.post'
import restartRoute from '../../server/api/admin/system/restart.post'

let currentActor: SessionUser | null = null
let server: Server | undefined
const exitSpy = vi.spyOn(processControl, 'exit').mockImplementation(() => undefined)

afterEach(async () => {
  currentActor = null
  delete process.env.APP_RESTART_ENABLED
  delete process.env.APP_RESTART_EXIT_CODE
  exitSpy.mockClear()
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
  const withActor = (handler: typeof statusRoute) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/admin/system/status', withActor(statusRoute))
  router.post('/api/admin/system/shutdown', withActor(shutdownRoute))
  router.post('/api/admin/system/restart', withActor(restartRoute))
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

describe('M8 admin system process controls', () => {
  it('rejects unauthenticated, STAFF, and VIEWER access; ADMIN can read status', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      await testDb.db.insert(users).values([{
        email: 'sys-staff@local',
        username: 'sys-staff',
        displayName: 'Sys Staff',
        role: 'STAFF',
        active: true,
        passwordHash: await hashStaffPassword('staff-password'),
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      }, {
        email: 'sys-viewer@local',
        username: 'sys-viewer',
        displayName: 'Sys Viewer',
        role: 'VIEWER',
        active: true,
        passwordHash: await hashStaffPassword('viewer-password'),
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      }])
      const base = await start(testDb)

      currentActor = null
      expect((await json(base, '/api/admin/system/status')).status).toBe(401)
      expect((await json(base, '/api/admin/system/shutdown', { method: 'POST', body: '{}' })).status).toBe(401)

      currentActor = await actorFor(testDb, 'sys-viewer')
      expect((await json(base, '/api/admin/system/status')).status).toBe(403)
      expect((await json(base, '/api/admin/system/shutdown', { method: 'POST', body: '{}' })).status).toBe(403)

      currentActor = await actorFor(testDb, 'sys-staff')
      expect((await json(base, '/api/admin/system/status')).status).toBe(403)
      expect((await json(base, '/api/admin/system/restart', { method: 'POST', body: '{}' })).status).toBe(403)

      currentActor = await actorFor(testDb, 'admin')
      const status = await json(base, '/api/admin/system/status')
      expect(status.status).toBe(200)
      const body = status.body as { restartEnabled: boolean, timezone: string, nodeEnv: string, app: string }
      expect(body.restartEnabled).toBe(false)
      expect(body.timezone).toBeTruthy()
      expect(body.app).toBe('Martial Arts Acquisition')
      expect(['development', 'test', 'production']).toContain(body.nodeEnv)
    } finally {
      await testDb.close()
    }
  })

  it('lets ADMIN shut down through the fixed POST operation and ignores extra command input', async () => {
    const testDb = await openTestDatabase()
    try {
      currentActor = await actorFor(testDb, 'admin')
      const base = await start(testDb)
      const wrongMethod = await json(base, '/api/admin/system/shutdown')
      expect(wrongMethod.status).toBeGreaterThanOrEqual(404)
      expect(exitSpy).not.toHaveBeenCalled()

      const shutdown = await json(base, '/api/admin/system/shutdown', {
        method: 'POST',
        body: JSON.stringify({ command: 'rm -rf /', arguments: ['anything'] }),
      })
      expect(shutdown.status).toBe(200)
      expect((shutdown.body as { action: string }).action).toBe('shutdown')
      expect(exitSpy).toHaveBeenCalledTimes(1)
      expect(exitSpy).toHaveBeenCalledWith(0)
      const events = await testDb.db.select().from(securityEvents)
      expect(events.some(row => row.action === 'APP_SHUTDOWN' && row.result === 'SUCCESS')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('rejects restart unless APP_RESTART_ENABLED is set, then exits with the configured code', async () => {
    const testDb = await openTestDatabase()
    try {
      currentActor = await actorFor(testDb, 'admin')
      const base = await start(testDb)
      const wrongMethod = await json(base, '/api/admin/system/restart')
      expect(wrongMethod.status).toBeGreaterThanOrEqual(404)
      expect(exitSpy).not.toHaveBeenCalled()

      const denied = await json(base, '/api/admin/system/restart', { method: 'POST', body: '{}' })
      expect(denied.status).toBe(400)
      expect(exitSpy).not.toHaveBeenCalled()

      process.env.APP_RESTART_ENABLED = 'true'
      process.env.APP_RESTART_EXIT_CODE = '42'
      const allowed = await json(base, '/api/admin/system/restart', {
        method: 'POST',
        body: JSON.stringify({ command: 'reboot now' }),
      })
      expect(allowed.status).toBe(200)
      expect((allowed.body as { action: string }).action).toBe('restart')
      expect(exitSpy).toHaveBeenCalledWith(42)
      const events = await testDb.db.select().from(securityEvents)
      expect(events.some(row => row.action === 'APP_RESTART')).toBe(true)
    } finally {
      await testDb.close()
    }
  })
})
