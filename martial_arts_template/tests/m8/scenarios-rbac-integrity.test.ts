import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { followUpTasks, users } from '../../server/database/schema'
import { hashStaffPassword } from '../../server/services/password'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { DomainError } from '../../server/services/errors'
import { convertLeadLine } from '../../server/services/conversion'
import { addLeadLineToHousehold } from '../../server/services/lead-lines'
import { listPublicSlots } from '../../server/services/availability'
import { createTrial, getLead } from '../../server/services/leads'
import { ensureInitialFollowUpTask } from '../../server/services/follow-up'
import { openTestDatabase } from '../helpers/db'
import createLeadRoute from '../../server/api/leads/index.post'
import getLeadRoute from '../../server/api/leads/[id].get'
import listLeadsRoute from '../../server/api/leads/index.get'
import createTrialRoute from '../../server/api/leads/[id]/trials.post'
import outcomeRoute from '../../server/api/trials/[id]/outcome.post'
import convertRoute from '../../server/api/leads/[id]/lines/[lineId]/convert.post'
import reverseRoute from '../../server/api/admin/conversions/[id]/reverse.post'
import listTasksRoute from '../../server/api/follow-up-tasks/index.get'
import {
  SCENARIO_NOW,
  assignDefaultOffering,
  convertHouseholdLine,
  createSingleAdultHousehold,
  markLineLost,
  nextPhone,
  programId,
  scheduleValidTrialForLine,
} from './helpers/scenarios'

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
  const withActor = (handler: typeof getLeadRoute) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.post('/api/leads', withActor(createLeadRoute))
  router.get('/api/leads', withActor(listLeadsRoute))
  router.get('/api/leads/:id', withActor(getLeadRoute))
  router.post('/api/leads/:id/trials', withActor(createTrialRoute))
  router.post('/api/trials/:id/outcome', withActor(outcomeRoute))
  router.post('/api/leads/:id/lines/:lineId/convert', withActor(convertRoute))
  router.post('/api/admin/conversions/:id/reverse', withActor(reverseRoute))
  router.get('/api/follow-up-tasks', withActor(listTasksRoute))
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

describe('M8 scenarios K — RBAC for Trial / conversion workflow', () => {
  it('lets STAFF run Trial and convert, blocks VIEWER/public mutation, and reserves reverse for ADMIN', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const [adminRow] = await testDb.db.select().from(users)
      await testDb.db.insert(users).values([
        {
          email: 'scenario-viewer@local',
          username: 'scenario-viewer',
          displayName: 'Scenario Viewer',
          role: 'VIEWER',
          active: true,
          passwordHash: await hashStaffPassword('viewer-password'),
          mustChangePassword: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          email: 'scenario-staff@local',
          username: 'scenario-staff',
          displayName: 'Scenario Staff',
          role: 'STAFF',
          active: true,
          passwordHash: await hashStaffPassword('staff-password'),
          mustChangePassword: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      const [viewerRow] = await testDb.db.select().from(users).where(eq(users.username, 'scenario-viewer'))
      const [staffRow] = await testDb.db.select().from(users).where(eq(users.username, 'scenario-staff'))
      const admin = asUser(adminRow!)
      const viewer = asUser(viewerRow!)
      const staff = asUser(staffRow!)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const base = await start(testDb)

      currentActor = null
      expect((await json(base, '/api/leads/1')).status).toBe(401)
      expect((await json(base, '/api/follow-up-tasks')).status).toBe(401)

      currentActor = viewer
      expect((await json(base, '/api/leads')).status).toBe(403)
      expect((await json(base, '/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Nope',
          phone: nextPhone(),
          programId: adult,
          source: 'WALK_IN',
        }),
      })).status).toBe(403)

      currentActor = staff
      const created = await json(base, '/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'StaffOp',
          phone: nextPhone(),
          programId: adult,
          source: 'WALK_IN',
        }),
      })
      expect(created.status).toBe(200)
      const lead = created.body as { id: number, lines: Array<{ id: number, programId: number }> }
      const slot = (await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ' }))[0]
      const scheduled = await json(base, `/api/leads/${lead.id}/trials`, {
        method: 'POST',
        body: JSON.stringify({ slotId: slot.id, leadLineId: lead.lines[0]!.id }),
      })
      expect(scheduled.status).toBe(200)
      const scheduledLead = scheduled.body as { trials: Array<{ id: number, status: string }> }
      const trialId = scheduledLead.trials.find(trial => trial.status === 'SCHEDULED')!.id
      const attended = await json(base, `/api/trials/${trialId}/outcome`, {
        method: 'POST',
        body: JSON.stringify({ status: 'ATTENDED' }),
      })
      expect(attended.status).toBe(200)
      await assignDefaultOffering(testDb.db, lead.lines[0]!)
      const converted = await json(base, `/api/leads/${lead.id}/lines/${lead.lines[0]!.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Joined at desk.' }),
      })
      expect(converted.status).toBe(200)
      const convertedLead = converted.body as { lines: Array<{ conversions?: Array<{ id: number }> }> }
      const conversionId = convertedLead.lines[0]!.conversions![0]!.id

      currentActor = staff
      expect((await json(base, `/api/admin/conversions/${conversionId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Staff should not reverse.' }),
      })).status).toBe(403)

      currentActor = admin
      const reversed = await json(base, `/api/admin/conversions/${conversionId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ note: 'Admin correction.' }),
      })
      expect(reversed.status).toBe(200)
    } finally {
      await testDb.close()
    }
  })
})

describe('M8 scenarios M — invalid / contradictory state', () => {
  it('rejects two active conversions, lost-on-converted, and a Trial on the wrong household', async () => {
    const testDb = await openTestDatabase()
    try {
      const first = await createSingleAdultHousehold(testDb.db, { firstName: 'ConvOne' })
      await convertHouseholdLine(testDb.db, first.lines[0]!)
      await expect(convertLeadLine(testDb.db, first.lines[0]!.id, {})).rejects.toBeInstanceOf(DomainError)
      await expect(markLineLost(testDb.db, first.lines[0]!.id)).rejects.toBeInstanceOf(DomainError)

      const other = await createSingleAdultHousehold(testDb.db, { firstName: 'OtherHouse' })
      await expect(createTrial(testDb.db, other.id, {
        scheduledAt: new Date(SCENARIO_NOW + 86_400_000),
        leadLineId: first.lines[0]!.id,
      })).rejects.toBeInstanceOf(DomainError)
    } finally {
      await testDb.close()
    }
  })

  it('rejects a second SELF LeadLine and consolidates leftover pending initials on a spouse line', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createSingleAdultHousehold(testDb.db, { firstName: 'DupSelf' })
      const adult = household.lines[0]!.programId
      await expect(addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SELF',
        firstName: 'AlsoSelf',
        programId: adult,
      })).rejects.toBeInstanceOf(DomainError)

      const spouse = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'AlsoAdult',
        programId: adult,
      })
      await scheduleValidTrialForLine(testDb.db, household.id, household.lines[0]!.id, 'ADULT_BJJ')
      const withTrial = await getLead(testDb.db, household.id)
      const firstTask = withTrial.followUpTasks.find(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')!
      await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(SCENARIO_NOW + 172_800_000),
        leadLineId: spouse.id,
      }, undefined, { nowMs: SCENARIO_NOW })
      await testDb.db.insert(followUpTasks).values({
        leadId: household.id,
        trialId: withTrial.trials.find(trial => trial.status === 'SCHEDULED' && trial.id !== firstTask.trialId)?.id ?? withTrial.trials[0]!.id,
        type: 'PHONE_CALL',
        purpose: 'INITIAL_SCHEDULE',
        dueAt: new Date(SCENARIO_NOW + 86_400_000),
        status: 'PENDING',
        createdAt: new Date(SCENARIO_NOW),
        updatedAt: new Date(SCENARIO_NOW),
      }).catch(() => undefined)

      await ensureInitialFollowUpTask(testDb.db, {
        leadId: household.id,
        trialId: withTrial.trials[0]!.id,
        leadLineId: household.lines[0]!.id,
      }, SCENARIO_NOW)
      const reconciled = await getLead(testDb.db, household.id)
      expect(reconciled.followUpTasks.filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING').length).toBe(1)
    } finally {
      await testDb.close()
    }
  })

  it('keeps closedAt null while any line remains active', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createSingleAdultHousehold(testDb.db, { firstName: 'OpenHouse' })
      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'StillOpen',
        programId: household.lines[0]!.programId,
      })
      await convertHouseholdLine(testDb.db, household.lines[0]!)
      const lead = await getLead(testDb.db, household.id)
      expect(lead.closedAt).toBeNull()
      expect(lead.lines.some(line => line.status !== 'JOINED' && line.status !== 'LOST')).toBe(true)
    } finally {
      await testDb.close()
    }
  })
})
