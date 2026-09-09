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
import { createLead, createTrial } from '../../server/services/leads'
import { openTestDatabase } from '../helpers/db'
import listTasks from '../../server/api/follow-up-tasks/index.get'
import createTask from '../../server/api/follow-up-tasks/index.post'
import patchTask from '../../server/api/follow-up-tasks/[id].patch'
import listUsers from '../../server/api/users.get'

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
  router.get('/api/follow-up-tasks', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return listTasks(event)
  }))
  router.post('/api/follow-up-tasks', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return createTask(event)
  }))
  router.patch('/api/follow-up-tasks/:id', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return patchTask(event)
  }))
  router.get('/api/users', eventHandler(async (event) => {
    event.context.authUser = currentActor
    return listUsers(event)
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

describe('M5 follow-up HTTP authorization', () => {
  it('rejects public writes, forbids VIEWER writes, and allows STAFF and ADMIN', async () => {
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

      const lead = await createLead(testDb.db, {
        firstName: 'Morgan',
        phone: '8015550400',
        programId: adult!.id,
        source: 'WALK_IN',
      })
      const created = await createTrial(testDb.db, lead.id, { scheduledAt: now })
      const task = created.followUpTasks![0]!

      const base = await start(testDb)

      currentActor = null
      expect((await json(base, '/api/follow-up-tasks')).status).toBe(401)
      expect((await json(base, '/api/users')).status).toBe(401)
      expect((await json(base, '/api/follow-up-tasks', {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id, dueAt: now.toISOString() }),
      })).status).toBe(401)

      currentActor = viewer
      const viewerGet = await json(base, '/api/follow-up-tasks')
      expect(viewerGet.status).toBe(403)
      expect((await json(base, '/api/users')).status).toBe(403)
      expect((await json(base, `/api/follow-up-tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'complete', outcome: 'REACHED' }),
      })).status).toBe(403)
      expect((await json(base, '/api/follow-up-tasks', {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id, dueAt: now.toISOString() }),
      })).status).toBe(403)

      currentActor = staff
      const staffAssign = await json(base, `/api/follow-up-tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'assign', assignedUserId: staff.id }),
      })
      expect(staffAssign.status).toBe(200)
      const staffComplete = await json(base, `/api/follow-up-tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'complete', outcome: 'NO_ANSWER', notes: 'No pickup.' }),
      })
      expect(staffComplete.status).toBe(200)
      expect((staffComplete.body as { status: string, outcome: string }).status).toBe('COMPLETED')
      expect((staffComplete.body as { outcome: string }).outcome).toBe('NO_ANSWER')

      currentActor = admin
      const adminCreate = await json(base, '/api/follow-up-tasks', {
        method: 'POST',
        body: JSON.stringify({
          leadId: lead.id,
          dueAt: new Date(now.getTime() + 86_400_000).toISOString(),
          notes: 'Call again Thursday',
        }),
      })
      expect(adminCreate.status).toBe(200)
      expect((adminCreate.body as { purpose: string, status: string }).purpose).toBe('MANUAL')
      expect((adminCreate.body as { status: string }).status).toBe('PENDING')
    } finally {
      await testDb.close()
    }
  })
})
