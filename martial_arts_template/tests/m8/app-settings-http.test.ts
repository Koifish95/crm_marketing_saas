import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { programs, securityEvents, users } from '../../server/database/schema'
import { hashStaffPassword } from '../../server/services/password'
import { utcNowMs } from '../../shared/utils/time'
import {
  ALLOW_EARLY_TRIAL_OUTCOMES_KEY,
  EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE,
} from '../../shared/utils/trial-outcomes'
import type { SessionUser } from '../../server/services/authorization'
import { createLead, createTrial, getLead } from '../../server/services/leads'
import { updateAllowEarlyTrialOutcomes } from '../../server/services/app-settings'
import { openTestDatabase } from '../helpers/db'
import getSettings from '../../server/api/admin/settings.get'
import patchSettings from '../../server/api/admin/settings.patch'
import getLeadRoute from '../../server/api/leads/[id].get'
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
  const withActor = (handler: typeof getSettings) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/admin/settings', withActor(getSettings))
  router.patch('/api/admin/settings', withActor(patchSettings))
  router.get('/api/leads/:id', withActor(getLeadRoute))
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
    email: 'settings-staff@local',
    username: 'settings-staff',
    displayName: 'Settings Staff',
    role: 'STAFF',
    active: true,
    passwordHash: await hashStaffPassword('staff-password'),
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  }, {
    email: 'settings-viewer@local',
    username: 'settings-viewer',
    displayName: 'Settings Viewer',
    role: 'VIEWER',
    active: true,
    passwordHash: await hashStaffPassword('viewer-password'),
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  }])
}

async function adultId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [row] = await db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
  return row!.id
}

describe('M8 application settings HTTP', () => {
  it('lets ADMIN read and change the setting and forbids STAFF, VIEWER, and unauthenticated access', async () => {
    const testDb = await openTestDatabase()
    try {
      await insertRoles(testDb)
      const base = await start(testDb)

      currentActor = null
      expect((await json(base, '/api/admin/settings')).status).toBe(401)
      expect((await json(base, '/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ allowEarlyTrialOutcomes: false }),
      })).status).toBe(401)

      currentActor = await actorFor(testDb, 'settings-viewer')
      expect((await json(base, '/api/admin/settings')).status).toBe(403)
      expect((await json(base, '/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ allowEarlyTrialOutcomes: false }),
      })).status).toBe(403)

      currentActor = await actorFor(testDb, 'settings-staff')
      expect((await json(base, '/api/admin/settings')).status).toBe(403)
      expect((await json(base, '/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ allowEarlyTrialOutcomes: false }),
      })).status).toBe(403)

      currentActor = await actorFor(testDb, 'admin')
      const read = await json(base, '/api/admin/settings')
      expect(read.status).toBe(200)
      expect((read.body as { allowEarlyTrialOutcomes: boolean, key: string }).allowEarlyTrialOutcomes).toBe(true)
      expect((read.body as { key: string }).key).toBe(ALLOW_EARLY_TRIAL_OUTCOMES_KEY)

      const changed = await json(base, '/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ allowEarlyTrialOutcomes: false }),
      })
      expect(changed.status).toBe(200)
      expect((changed.body as { allowEarlyTrialOutcomes: boolean }).allowEarlyTrialOutcomes).toBe(false)

      const reread = await json(base, '/api/admin/settings')
      expect((reread.body as { allowEarlyTrialOutcomes: boolean }).allowEarlyTrialOutcomes).toBe(false)

      const events = await testDb.db.select().from(securityEvents)
      expect(events.some((row) => {
        if (row.action !== 'APP_SETTING_CHANGED' || row.actorUserId !== currentActor?.id) {
          return false
        }
        const metadata = JSON.parse(row.metadata || '{}') as { key: string, previousValue: boolean, newValue: boolean }
        return metadata.key === ALLOW_EARLY_TRIAL_OUTCOMES_KEY && metadata.previousValue === true && metadata.newValue === false
      })).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('rejects an early STAFF outcome over HTTP when the setting is OFF and allows past outcomes', async () => {
    const testDb = await openTestDatabase()
    try {
      await insertRoles(testDb)
      const admin = await actorFor(testDb, 'admin')
      await updateAllowEarlyTrialOutcomes(testDb.db, false, admin)
      const program = await adultId(testDb.db)
      const futureLead = await createLead(testDb.db, {
        firstName: 'HttpFuture',
        phone: '8015559201',
        programId: program,
        source: 'WALK_IN',
      })
      const future = await createTrial(testDb.db, futureLead.id, {
        scheduledAt: new Date(utcNowMs() + 86_400_000),
        leadLineId: futureLead.lines[0]!.id,
      })
      const futureTrial = future.trials.find(trial => trial.status === 'SCHEDULED')!

      const pastLead = await createLead(testDb.db, {
        firstName: 'HttpPast',
        phone: '8015559202',
        programId: program,
        source: 'WALK_IN',
      })
      const past = await createTrial(testDb.db, pastLead.id, {
        scheduledAt: new Date(utcNowMs() - 86_400_000),
        leadLineId: pastLead.lines[0]!.id,
      })
      const pastTrial = past.trials.find(trial => trial.status === 'SCHEDULED')!

      const base = await start(testDb)
      currentActor = await actorFor(testDb, 'settings-staff')
      const early = await json(base, `/api/trials/${futureTrial.id}/outcome`, {
        method: 'POST',
        body: JSON.stringify({ status: 'ATTENDED' }),
      })
      expect(early.status).toBe(400)
      const earlyBody = early.body as { message?: string, statusMessage?: string }
      expect(earlyBody.message || earlyBody.statusMessage).toBe(EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE)
      expect((await getLead(testDb.db, futureLead.id)).trials[0]?.status).toBe('SCHEDULED')

      const allowed = await json(base, `/api/trials/${pastTrial.id}/outcome`, {
        method: 'POST',
        body: JSON.stringify({ status: 'NO_SHOW' }),
      })
      expect(allowed.status).toBe(200)

      currentActor = await actorFor(testDb, 'settings-viewer')
      const viewer = await json(base, `/api/trials/${futureTrial.id}/outcome`, {
        method: 'POST',
        body: JSON.stringify({ status: 'NO_SHOW' }),
      })
      expect(viewer.status).toBe(403)
      expect((await json(base, `/api/leads/${futureLead.id}`)).status).toBe(403)
    } finally {
      await testDb.close()
    }
  })
})
