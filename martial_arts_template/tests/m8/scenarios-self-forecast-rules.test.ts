import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests } from '../../server/database'
import { conversions, users } from '../../server/database/schema'
import { hashStaffPassword } from '../../server/services/password'
import { denverYmd, utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from '../../server/services/authorization'
import { upsertMembershipOffering } from '../../server/services/catalog'
import { reverseConversion } from '../../server/services/conversion'
import { DomainError } from '../../server/services/errors'
import { forecastHousehold } from '../../server/services/forecast'
import { addLeadLineToHousehold, changeLeadLineStatus, updateLeadLine } from '../../server/services/lead-lines'
import { bookPublicHousehold } from '../../server/services/public-trial'
import { acquisitionReport, reportCsv } from '../../server/services/reports'
import { publicHouseholdTrialSchema } from '../../shared/schemas/intro'
import { dollarsToCents } from '../../shared/utils/money'
import { openTestDatabase } from '../helpers/db'
import addLineRoute from '../../server/api/leads/[id]/lines/index.post'
import patchLineRoute from '../../server/api/leads/[id]/lines/[lineId].patch'
import {
  adminActor,
  adultSlot,
  assignDefaultOffering,
  convertHouseholdLine,
  createGuardianChildHousehold,
  createParentChildHousehold,
  createSingleAdultHousehold,
  createTwoChildHousehold,
  lineByRelationship,
  markLineLost,
  nextPhone,
  offeringFor,
  programId,
  SCENARIO_NOW,
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
  const withActor = (handler: typeof addLineRoute) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.post('/api/leads/:id/lines', withActor(addLineRoute))
  router.patch('/api/leads/:id/lines/:lineId', withActor(patchLineRoute))
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

async function staffActor(testDb: Awaited<ReturnType<typeof openTestDatabase>>): Promise<SessionUser> {
  const now = new Date(utcNowMs())
  await testDb.db.insert(users).values({
    email: 'self-staff@local',
    username: 'self-staff',
    displayName: 'Self Staff',
    role: 'STAFF',
    active: true,
    passwordHash: await hashStaffPassword('staff-password'),
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  })
  const [staffRow] = await testDb.db.select().from(users).where(eq(users.username, 'self-staff'))
  return {
    id: staffRow!.id,
    email: staffRow!.email,
    displayName: staffRow!.displayName,
    role: 'STAFF',
    mustChangePassword: false,
  }
}

describe('M8 business rule — at most one SELF LeadLine', () => {
  it('lets a household with no SELF add SELF, and keeps guardian-only households at zero SELF', async () => {
    const testDb = await openTestDatabase()
    try {
      const guardian = await createGuardianChildHousehold(testDb.db)
      expect(guardian.lines.every(line => line.relationship !== 'SELF')).toBe(true)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const added = await addLeadLineToHousehold(testDb.db, guardian.id, {
        relationship: 'SELF',
        firstName: 'Pat',
        programId: adult,
      })
      expect(added.relationship).toBe('SELF')

      const twoKids = await createTwoChildHousehold(testDb.db)
      expect(twoKids.lines.filter(line => line.relationship === 'SELF')).toHaveLength(0)
    } finally {
      await testDb.close()
    }
  })

  it('rejects a second SELF through staff add-person and allows CHILD/SPOUSE/OTHER beside SELF', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createSingleAdultHousehold(testDb.db, { firstName: 'Scott' })
      await expect(addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SELF',
        firstName: 'Jane',
        programId: household.lines[0]!.programId,
      })).rejects.toMatchObject({ message: expect.stringContaining('primary contact') })

      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Jane',
        programId: household.lines[0]!.programId,
      })
      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Kid',
        programId: await programId(testDb.db, 'KIDS_BJJ'),
        age: 8,
      })
      await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'OTHER',
        firstName: 'Coach',
        programId: household.lines[0]!.programId,
      })
      const after = await createParentChildHousehold(testDb.db)
      expect(after.lines.filter(line => line.relationship === 'SELF')).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('rejects a second SELF on staff HTTP POST and PATCH', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createSingleAdultHousehold(testDb.db, { firstName: 'HttpDad' })
      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'HttpKid',
        programId: await programId(testDb.db, 'KIDS_BJJ'),
        age: 8,
      })
      currentActor = await staffActor(testDb)
      const base = await start(testDb)

      const posted = await json(base, `/api/leads/${household.id}/lines`, {
        method: 'POST',
        body: JSON.stringify({
          relationship: 'SELF',
          firstName: 'SecondSelf',
          programId: household.lines[0]!.programId,
        }),
      })
      expect(posted.status).toBe(400)

      const patched = await json(base, `/api/leads/${household.id}/lines/${child.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ relationship: 'SELF' }),
      })
      expect(patched.status).toBe(400)
    } finally {
      await testDb.close()
    }
  })

  it('keeps public booking from creating two SELF members', async () => {
    const testDb = await openTestDatabase()
    try {
      const slot = await adultSlot(testDb.db)
      const parsed = publicHouseholdTrialSchema.safeParse({
        firstName: 'Scott',
        lastName: 'One',
        phone: nextPhone(),
        idempotencyKey: crypto.randomUUID(),
        members: [{
          relationship: 'SELF',
          firstName: 'Scott',
          lastName: 'One',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }, {
          relationship: 'SELF',
          firstName: 'Jane',
          lastName: 'Two',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }],
      })
      expect(parsed.success).toBe(false)
      await expect(bookPublicHousehold(testDb.db, {
        firstName: 'Scott',
        lastName: 'One',
        phone: nextPhone(),
        members: [{
          relationship: 'SELF',
          firstName: 'Scott',
          lastName: 'One',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }, {
          relationship: 'SELF',
          firstName: 'Jane',
          lastName: 'Two',
          programCode: 'ADULT_BJJ',
          slotId: slot.id,
        }],
      }, { nowMs: SCENARIO_NOW })).rejects.toBeInstanceOf(DomainError)
    } finally {
      await testDb.close()
    }
  })

  it('rejects changing a sibling line to SELF when SELF already exists', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createParentChildHousehold(testDb.db)
      const child = lineByRelationship(household, 'CHILD')!
      await expect(updateLeadLine(testDb.db, child.id, { relationship: 'SELF' })).rejects.toBeInstanceOf(DomainError)
      const parent = lineByRelationship(household, 'SELF')!
      const renamed = await updateLeadLine(testDb.db, parent.id, { firstName: 'Matthew' })
      expect(renamed.relationship).toBe('SELF')
    } finally {
      await testDb.close()
    }
  })
})

describe('M8 business rule — Forecast MRR excludes JOINED and LOST', () => {
  it('prices only open opportunities and keeps conversion snapshots separate', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const kids = await programId(testDb.db, 'KIDS_BJJ')
      const adultOffering = await offeringFor(testDb.db, adult)
      const kidsOffering = await offeringFor(testDb.db, kids)
      const household = await createSingleAdultHousehold(testDb.db, { firstName: 'Dad' })
      await updateLeadLine(testDb.db, household.lines[0]!.id, { membershipOfferingId: adultOffering.id })
      const standard = await forecastHousehold(testDb.db, household.id)
      expect(standard.monthlyCents).toBe(dollarsToCents('175'))
      expect(standard.lines.find(row => row.leadLineId === household.lines[0]!.id)?.includedInForecast).toBe(true)

      const spouse = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'SPOUSE',
        firstName: 'Spouse',
        programId: adult,
        membershipOfferingId: adultOffering.id,
      })
      const family = await forecastHousehold(testDb.db, household.id)
      expect(family.monthlyCents).toBe(17500 + 15500)

      await updateLeadLine(testDb.db, spouse.id, {
        monthlyOverrideCents: dollarsToCents('100'),
        discountReason: 'Military',
      })
      expect((await forecastHousehold(testDb.db, household.id)).monthlyCents).toBe(17500 + 10000)

      const child = await addLeadLineToHousehold(testDb.db, household.id, {
        relationship: 'CHILD',
        firstName: 'Kid',
        programId: kids,
        age: 8,
        membershipOfferingId: kidsOffering.id,
      })
      const conversion = await convertHouseholdLine(testDb.db, household.lines[0]!, actor)
      const afterDad = await forecastHousehold(testDb.db, household.id)
      expect(afterDad.monthlyCents).toBe(10000 + 15000)
      expect(afterDad.lines.find(row => row.leadLineId === household.lines[0]!.id)?.forecastMonthlyCents).toBe(0)
      expect(afterDad.lines.find(row => row.leadLineId === household.lines[0]!.id)?.includedInForecast).toBe(false)

      await upsertMembershipOffering(testDb.db, {
        id: adultOffering.id,
        name: adultOffering.name,
        programId: adultOffering.programId,
        monthlyCents: 19900,
        enrollmentCents: adultOffering.enrollmentCents,
        active: true,
      })
      const [stored] = await testDb.db.select().from(conversions).where(eq(conversions.id, conversion.id))
      expect(stored?.monthlyCents).toBe(17500)

      await markLineLost(testDb.db, child.id, actor)
      const mixed = await forecastHousehold(testDb.db, household.id)
      expect(mixed.monthlyCents).toBe(10000)
      expect(mixed.lines.find(row => row.leadLineId === child.id)?.forecastMonthlyCents).toBe(0)

      await markLineLost(testDb.db, spouse.id, actor)
      expect((await forecastHousehold(testDb.db, household.id)).monthlyCents).toBe(0)

      const reportWindow = {
        fromYmd: denverYmd(SCENARIO_NOW),
        toYmd: denverYmd(Math.max(SCENARIO_NOW + 8 * 86_400_000, utcNowMs())),
      }
      const report = await acquisitionReport(testDb.db, reportWindow)
      expect(report.conversions.newMrrCents).toBe(17500)
      const csv = await reportCsv(testDb.db, reportWindow, 'conversions', true)
      expect(csv).toContain('17500')
      expect(report.conversions.count).toBe(1)
    } finally {
      await testDb.close()
    }
  })

  it('restores Forecast MRR after reopen and conversion reversal, and terminal-only households forecast $0', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const adult = await programId(testDb.db, 'ADULT_BJJ')
      const offering = await offeringFor(testDb.db, adult)

      const lostHousehold = await createSingleAdultHousehold(testDb.db, { firstName: 'LostThenOpen' })
      await updateLeadLine(testDb.db, lostHousehold.lines[0]!.id, { membershipOfferingId: offering.id })
      await markLineLost(testDb.db, lostHousehold.lines[0]!.id, actor)
      expect((await forecastHousehold(testDb.db, lostHousehold.id)).monthlyCents).toBe(0)
      await changeLeadLineStatus(testDb.db, lostHousehold.lines[0]!.id, { toStatus: 'CONTACTED', note: 'Trying again.' }, actor)
      expect((await forecastHousehold(testDb.db, lostHousehold.id)).monthlyCents).toBe(17500)

      const allLost = await createSingleAdultHousehold(testDb.db, { firstName: 'AllLost' })
      await assignDefaultOffering(testDb.db, allLost.lines[0]!)
      await markLineLost(testDb.db, allLost.lines[0]!.id, actor)
      expect((await forecastHousehold(testDb.db, allLost.id)).monthlyCents).toBe(0)

      const joined = await createSingleAdultHousehold(testDb.db, { firstName: 'JoinedThenReverse' })
      await assignDefaultOffering(testDb.db, joined.lines[0]!)
      const conversion = await convertHouseholdLine(testDb.db, joined.lines[0]!, actor)
      expect((await forecastHousehold(testDb.db, joined.id)).monthlyCents).toBe(0)
      await reverseConversion(testDb.db, conversion.id, { note: 'Wrong person.' }, actor)
      expect((await forecastHousehold(testDb.db, joined.id)).monthlyCents).toBe(17500)

      const both = await createSingleAdultHousehold(testDb.db, { firstName: 'AllJoined' })
      const partner = await addLeadLineToHousehold(testDb.db, both.id, {
        relationship: 'SPOUSE',
        firstName: 'Partner',
        programId: adult,
        membershipOfferingId: offering.id,
      })
      await assignDefaultOffering(testDb.db, both.lines[0]!)
      await convertHouseholdLine(testDb.db, both.lines[0]!, actor)
      await convertHouseholdLine(testDb.db, partner, actor)
      expect((await forecastHousehold(testDb.db, both.id)).monthlyCents).toBe(0)
    } finally {
      await testDb.close()
    }
  })
})
