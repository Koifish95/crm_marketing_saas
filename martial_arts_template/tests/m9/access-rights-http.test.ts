import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { userRoles, users } from '../../server/database/schema'
import { createManagedUser } from '../../server/services/users'
import { createCampaign } from '../../server/services/campaigns'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { openTestDatabase } from '../helpers/db'
import marketingOverview from '../../server/api/marketing/overview.get'
import campaignPerformance from '../../server/api/marketing/campaigns/[id]/performance.get'
import marketingTaskGet from '../../server/api/marketing/tasks/[id].get'
import marketingTaskPatch from '../../server/api/marketing/tasks/[id].patch'
import accessCatalog from '../../server/api/admin/access/index.get'
import assignRoles from '../../server/api/admin/users/[id]/roles.put'
import { createMarketingTask } from '../../server/services/marketing-tasks'

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
  const withActor = (handler: typeof marketingOverview) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/marketing/overview', withActor(marketingOverview))
  router.get('/api/marketing/campaigns/:id/performance', withActor(campaignPerformance))
  router.get('/api/marketing/tasks/:id', withActor(marketingTaskGet))
  router.patch('/api/marketing/tasks/:id', withActor(marketingTaskPatch))
  router.get('/api/admin/access', withActor(accessCatalog))
  router.put('/api/admin/users/:id/roles', withActor(assignRoles))
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

function asUser(row: { id: number, email: string, displayName: string, role: string }): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as SessionUser['role'],
    mustChangePassword: false,
  }
}

async function readyUser(
  db: Awaited<ReturnType<typeof openTestDatabase>>['db'],
  input: { displayName: string, email: string, role: 'ADMIN' | 'STAFF' | 'VIEWER' },
) {
  const created = await createManagedUser(db, input)
  await db.update(users).set({
    mustChangePassword: false,
    updatedAt: new Date(utcNowMs()),
  }).where(eq(users.id, created.id))
  return created
}

describe('M9 access rights HTTP', () => {
  it('denies Marketing overview to STAFF without Access Rights and to VIEWER', async () => {
    const testDb = await openTestDatabase()
    try {
      const base = await start(testDb)
      const [admin] = await testDb.db.select().from(users)
      const staff = await readyUser(testDb.db, {
        displayName: 'Staff',
        email: 'staff.access@example.com',
        role: 'STAFF',
      })
      const viewer = await readyUser(testDb.db, {
        displayName: 'Viewer',
        email: 'viewer.access@example.com',
        role: 'VIEWER',
      })

      currentActor = null
      expect((await json(base, '/api/marketing/overview')).status).toBe(401)

      currentActor = asUser(staff)
      expect((await json(base, '/api/marketing/overview')).status).toBe(403)

      currentActor = asUser(viewer)
      expect((await json(base, '/api/marketing/overview')).status).toBe(403)

      currentActor = asUser(admin!)
      expect((await json(base, '/api/marketing/overview')).status).toBe(200)
    } finally {
      await testDb.close()
    }
  })

  it('allows STAFF after assigning a Marketing User Role', async () => {
    const testDb = await openTestDatabase()
    try {
      const base = await start(testDb)
      const [admin] = await testDb.db.select().from(users)
      const staff = await readyUser(testDb.db, {
        displayName: 'Pedro',
        email: 'pedro.access@example.com',
        role: 'STAFF',
      })
      const [viewerRole] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'MARKETING_VIEWER'))
      currentActor = asUser(admin!)
      const assigned = await json(base, `/api/admin/users/${staff.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ userRoleIds: [viewerRole!.id] }),
      })
      expect(assigned.status).toBe(200)
      currentActor = asUser(staff)
      const overview = await json(base, '/api/marketing/overview')
      expect(overview.status).toBe(200)
    } finally {
      await testDb.close()
    }
  })

  it('keeps Access catalog ADMIN-only', async () => {
    const testDb = await openTestDatabase()
    try {
      const base = await start(testDb)
      const staff = await readyUser(testDb.db, {
        displayName: 'Staff',
        email: 'staff.catalog@example.com',
        role: 'STAFF',
      })
      currentActor = asUser(staff)
      expect((await json(base, '/api/admin/access')).status).toBe(403)
      const [admin] = await testDb.db.select().from(users)
      currentActor = asUser(admin!)
      const catalog = await json(base, '/api/admin/access')
      expect(catalog.status).toBe(200)
      const body = catalog.body as { accessRights: string[] }
      expect(body.accessRights).toContain('VIEW_MARKETING')
    } finally {
      await testDb.close()
    }
  })

  it('gates Campaign performance on VIEW_MARKETING_REPORTS without hiding VIEW_MARKETING overview access', async () => {
    const testDb = await openTestDatabase()
    try {
      const base = await start(testDb)
      const [admin] = await testDb.db.select().from(users)
      const campaign = await createCampaign(testDb.db, { name: 'Reports Gate Campaign', status: 'ACTIVE' })
      const viewer = await readyUser(testDb.db, {
        displayName: 'Marketing viewer',
        email: 'viewer.perf@example.com',
        role: 'STAFF',
      })
      const manager = await readyUser(testDb.db, {
        displayName: 'Campaign manager',
        email: 'manager.perf@example.com',
        role: 'STAFF',
      })
      const [viewerRole] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'MARKETING_VIEWER'))
      const [managerRole] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'CAMPAIGN_MANAGER'))
      currentActor = asUser(admin!)
      expect((await json(base, `/api/admin/users/${viewer.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ userRoleIds: [viewerRole!.id] }),
      })).status).toBe(200)
      expect((await json(base, `/api/admin/users/${manager.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ userRoleIds: [managerRole!.id] }),
      })).status).toBe(200)

      currentActor = asUser(manager)
      expect((await json(base, '/api/marketing/overview')).status).toBe(200)
      expect((await json(base, `/api/marketing/campaigns/${campaign.id}/performance`)).status).toBe(403)

      currentActor = asUser(viewer)
      const allowed = await json(base, `/api/marketing/campaigns/${campaign.id}/performance`)
      expect(allowed.status).toBe(200)
      const body = allowed.body as { plannedBudgetSource?: string, mapped?: boolean }
      expect(body.plannedBudgetSource).toBe('internal_crm')
      expect(body.mapped).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('lets VIEW_MARKETING read a Marketing Task and keeps PATCH behind MANAGE_MARKETING_TASKS', async () => {
    const testDb = await openTestDatabase()
    try {
      const base = await start(testDb)
      const [admin] = await testDb.db.select().from(users)
      const task = await createMarketingTask(testDb.db, {
        title: 'Caption draft',
        type: 'DRAFT_CAPTION',
        dueAt: new Date(utcNowMs() + 86_400_000),
      }, asUser(admin!))
      const viewer = await readyUser(testDb.db, {
        displayName: 'Marketing viewer',
        email: 'viewer.task@example.com',
        role: 'STAFF',
      })
      const [viewerRole] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'MARKETING_VIEWER'))
      currentActor = asUser(admin!)
      expect((await json(base, `/api/admin/users/${viewer.id}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ userRoleIds: [viewerRole!.id] }),
      })).status).toBe(200)

      currentActor = asUser(viewer)
      const loaded = await json(base, `/api/marketing/tasks/${task.id}`)
      expect(loaded.status).toBe(200)
      expect((loaded.body as { title?: string }).title).toBe('Caption draft')
      expect((await json(base, '/api/marketing/tasks/999999')).status).toBe(404)
      expect((await json(base, `/api/marketing/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      })).status).toBe(403)

      currentActor = asUser(admin!)
      expect((await json(base, `/api/marketing/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      })).status).toBe(200)
    } finally {
      await testDb.close()
    }
  })
})
