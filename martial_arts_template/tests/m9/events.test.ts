import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { followUpTasks, leads, programs, users } from '../../server/database/schema'
import { createCampaign } from '../../server/services/campaigns'
import {
  addEventSession,
  createAcquisitionEvent,
  executeEventBatch,
  getAcquisitionEvent,
  listAcquisitionEvents,
  previewEventBatch,
  registerPublicEvent,
  registerStaffEvent,
  updateAcquisitionEvent,
  updateEventRegistration,
  updateEventRegistrationLine,
} from '../../server/services/events'
import { createLead, getLead } from '../../server/services/leads'
import { utcNowMs } from '../../shared/utils/time'
import { eventStaffPath } from '../../shared/utils/event'
import { openTestDatabase } from '../helpers/db'

function actorFrom(row: { id: number, email: string, displayName: string, role: string }) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as 'ADMIN',
    mustChangePassword: false,
  }
}

async function publishedEvent(
  db: Awaited<ReturnType<typeof openTestDatabase>>['db'],
  actor: ReturnType<typeof actorFrom>,
  options?: { capacity?: number | null, secondSession?: boolean, campaignId?: number | null, opensAt?: Date | null, closesAt?: Date | null },
) {
  const [kids] = await db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
  const event = await createAcquisitionEvent(db, {
    title: 'Kids Wrestling Open House',
    programId: kids!.id,
    campaignId: options?.campaignId,
    registrationOpensAt: options?.opensAt,
    registrationClosesAt: options?.closesAt,
  }, actor)
  const sessionA = await addEventSession(db, event.id, {
    name: 'Saturday 10am',
    startsAt: new Date(utcNowMs() + 86_400_000),
    capacity: options?.capacity ?? null,
    programId: kids!.id,
  })
  const sessionB = options?.secondSession
    ? await addEventSession(db, event.id, {
        name: 'Saturday 11am',
        startsAt: new Date(utcNowMs() + 90_000_000),
        programId: kids!.id,
      })
    : null
  const published = await updateAcquisitionEvent(db, event.id, { status: 'PUBLISHED' })
  return { event: published, sessionA, sessionB, kids: kids! }
}

describe('M9 acquisition events', () => {
  it('keeps registration off the Lead CRM until batch process', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const { event, sessionA } = await publishedEvent(testDb.db, actor)
      const before = await testDb.db.select().from(leads)
      await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Jordan',
        lastName: 'Lee',
        phone: '8015550100',
        participants: [{ firstName: 'Avery', lastName: 'Lee', age: 8, sessionId: sessionA.id }],
      })
      const after = await testDb.db.select().from(leads)
      expect(after).toHaveLength(before.length)
    } finally {
      await testDb.close()
    }
  })

  it('enforces session capacity and registration windows', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const { event, sessionA } = await publishedEvent(testDb.db, actor, { capacity: 1 })
      await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Sam',
        lastName: 'Kim',
        phone: '8015550101',
        participants: [{ firstName: 'Rio', sessionId: sessionA.id, age: 9 }],
      })
      await expect(registerPublicEvent(testDb.db, event.id, {
        firstName: 'Pat',
        lastName: 'Ortiz',
        phone: '8015550102',
        participants: [{ firstName: 'Nico', sessionId: sessionA.id, age: 9 }],
      })).rejects.toMatchObject({ message: expect.stringContaining('full') })

      const closed = await publishedEvent(testDb.db, actor, {
        opensAt: new Date(utcNowMs() + 86_400_000),
      })
      await expect(registerPublicEvent(testDb.db, closed.event.id, {
        firstName: 'Early',
        lastName: 'Bird',
        phone: '8015550103',
        participants: [{ firstName: 'Kid', sessionId: closed.sessionA.id, age: 7 }],
      })).rejects.toMatchObject({ message: expect.stringContaining('not opened') })
    } finally {
      await testDb.close()
    }
  })

  it('registers multiple participants on different sessions and attributes only new households', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      const campaign = await createCampaign(testDb.db, { name: 'Open House Push', status: 'ACTIVE' })
      const original = await createLead(testDb.db, {
        firstName: 'Morgan',
        lastName: 'Adey',
        phone: '8015550200',
        programId: kids!.id,
        source: 'PHONE',
        campaignId: null,
      }, actor)
      const { event, sessionA, sessionB } = await publishedEvent(testDb.db, actor, {
        secondSession: true,
        campaignId: campaign.id,
      })
      const created = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Chris',
        lastName: 'Park',
        phone: '8015550201',
        campaign: campaign.slug,
        participants: [
          { firstName: 'Mina', lastName: 'Park', age: 7, sessionId: sessionA.id },
          { firstName: 'Leo', lastName: 'Park', age: 9, sessionId: sessionB!.id },
        ],
      })
      const existingReg = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Morgan',
        lastName: 'Adey',
        phone: '8015550200',
        campaign: campaign.slug,
        participants: [{ firstName: 'Sage', lastName: 'Adey', age: 8, sessionId: sessionA.id }],
      })
      for (const line of [...created.lines, ...existingReg.lines]) {
        await updateEventRegistrationLine(testDb.db, line.id, { attendance: 'ATTENDED' }, actor)
      }
      const preview = await previewEventBatch(testDb.db, event.id)
      expect(preview.newHouseholds).toBe(1)
      expect(preview.existingMatches).toBe(1)
      expect(preview.followUpTasksToCreate).toBe(2)
      const result = await executeEventBatch(testDb.db, event.id, {}, actor)
      expect(result.createdLeadIds).toHaveLength(1)
      const [newLead] = await testDb.db.select().from(leads).where(eq(leads.phone, '8015550201'))
      expect(newLead?.campaignId).toBe(campaign.id)
      const [kept] = await testDb.db.select().from(leads).where(eq(leads.id, original.id))
      expect(kept?.campaignId).toBeNull()
      expect(kept?.source).toBe('PHONE')
      const tasks = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.purpose, 'EVENT_FOLLOW_UP'))
      expect(tasks).toHaveLength(2)
      await executeEventBatch(testDb.db, event.id, {}, actor)
      const tasksAgain = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.purpose, 'EVENT_FOLLOW_UP'))
      expect(tasksAgain).toHaveLength(2)
      const leadsAgain = await testDb.db.select().from(leads).where(eq(leads.phone, '8015550201'))
      expect(leadsAgain).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('requires a human choice for ambiguous matches, honors exclude, and rolls back on failure', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      await createLead(testDb.db, {
        firstName: 'Alex',
        lastName: 'One',
        phone: '8015550300',
        programId: kids!.id,
        source: 'WALK_IN',
      }, actor)
      await createLead(testDb.db, {
        firstName: 'Alex',
        lastName: 'Two',
        phone: '8015550300',
        programId: kids!.id,
        source: 'PHONE',
      }, actor)
      const { event, sessionA } = await publishedEvent(testDb.db, actor)
      const fresh = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Quinn',
        lastName: 'New',
        phone: '8015550301',
        participants: [{ firstName: 'Remy', sessionId: sessionA.id, age: 8 }],
      })
      const ambiguous = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Alex',
        lastName: 'Family',
        phone: '8015550300',
        participants: [{ firstName: 'Kiddo', sessionId: sessionA.id, age: 8 }],
      })
      const skipped = await registerStaffEvent(testDb.db, event.id, {
        firstName: 'Skip',
        lastName: 'Me',
        phone: '8015550302',
        source: 'WALK_IN',
        participants: [{ firstName: 'Skip', sessionId: sessionA.id, age: 8 }],
      }, actor)
      for (const line of [...fresh.lines, ...ambiguous.lines, ...skipped.lines]) {
        await updateEventRegistrationLine(testDb.db, line.id, { attendance: 'NO_SHOW' }, actor)
      }
      await updateEventRegistration(testDb.db, skipped.id, { excludeFromProcessing: true }, actor)
      const preview = await previewEventBatch(testDb.db, event.id)
      expect(preview.ambiguous).toBe(1)
      expect(preview.excluded).toBe(1)
      expect(preview.newHouseholds).toBe(1)
      const before = await testDb.db.select().from(leads)
      await expect(executeEventBatch(testDb.db, event.id, {}, actor))
        .rejects.toMatchObject({ message: expect.stringContaining('Ambiguous') })
      const after = await testDb.db.select().from(leads)
      expect(after).toHaveLength(before.length)
      expect(after.some(row => row.phone === '8015550301')).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('lists acquisition events for one campaign', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const campaign = await createCampaign(testDb.db, { name: 'Event Filter Campaign' })
      const other = await createCampaign(testDb.db, { name: 'Other Event Campaign' })
      const mine = await createAcquisitionEvent(testDb.db, { title: 'Mine Event', campaignId: campaign.id }, actor)
      await createAcquisitionEvent(testDb.db, { title: 'Theirs Event', campaignId: other.id }, actor)
      const listed = await listAcquisitionEvents(testDb.db, { campaignId: campaign.id })
      expect(listed.map(item => item.id)).toEqual([mine.id])
      expect(eventStaffPath(mine.id)).toBe(`/marketing/events/${mine.id}`)
    } finally {
      await testDb.close()
    }
  })

  it('exposes processed event and session on the household for staff click-through', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const { event, sessionA } = await publishedEvent(testDb.db, actor)
      const registration = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Jordan',
        lastName: 'Click',
        phone: '8015550400',
        participants: [{ firstName: 'Avery', lastName: 'Click', age: 8, sessionId: sessionA.id }],
      })
      await updateEventRegistrationLine(testDb.db, registration.lines[0]!.id, { attendance: 'ATTENDED' }, actor)
      const result = await executeEventBatch(testDb.db, event.id, {}, actor)
      expect(result.createdLeadIds).toHaveLength(1)
      const household = await getLead(testDb.db, result.createdLeadIds[0]!)
      expect(household.acquisitionEvents).toEqual([
        {
          id: event.id,
          title: event.title,
          sessions: [{ id: sessionA.id, name: 'Saturday 10am' }],
        },
      ])
    } finally {
      await testDb.close()
    }
  })

  it('warns staff about same-event and CRM contact matches without blocking public signup', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      const original = await createLead(testDb.db, {
        firstName: 'Morgan',
        lastName: 'Adey',
        phone: '8015550500',
        programId: kids!.id,
        source: 'PHONE',
      }, actor)
      const { event, sessionA } = await publishedEvent(testDb.db, actor)
      const first = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Morgan',
        lastName: 'Adey',
        phone: '8015550500',
        participants: [{ firstName: 'Sage', sessionId: sessionA.id, age: 8 }],
      })
      const second = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Morgan',
        lastName: 'Adey',
        phone: '8015550500',
        participants: [{ firstName: 'Riley', sessionId: sessionA.id, age: 10 }],
      })
      const loaded = await getAcquisitionEvent(testDb.db, event.id)
      const firstWarnings = loaded.registrations.find(row => row.id === first.id)?.duplicateWarnings ?? []
      const secondWarnings = loaded.registrations.find(row => row.id === second.id)?.duplicateWarnings ?? []
      expect(firstWarnings.some(item => item.kind === 'EVENT_REGISTRATION' && item.registrationId === second.id)).toBe(true)
      expect(firstWarnings.some(item => item.kind === 'CRM_HOUSEHOLD' && item.leadId === original.id)).toBe(true)
      expect(secondWarnings.some(item => item.kind === 'EVENT_REGISTRATION' && item.registrationId === first.id)).toBe(true)
      for (const line of [...first.lines, ...second.lines]) {
        await updateEventRegistrationLine(testDb.db, line.id, { attendance: 'ATTENDED' }, actor)
      }
      const preview = await previewEventBatch(testDb.db, event.id)
      expect(preview.rows).toHaveLength(1)
      expect(preview.rows[0]?.outcome).toBe('MATCH')
      expect(preview.rows[0]?.registrations.map(item => item.id).sort()).toEqual([first.id, second.id].sort())
      expect(preview.followUpTasksToCreate).toBe(1)
      const result = await executeEventBatch(testDb.db, event.id, {}, actor)
      expect(result.createdLeadIds).toHaveLength(0)
      const tasks = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.purpose, 'EVENT_FOLLOW_UP'))
      expect(tasks.filter(task => task.leadId === original.id)).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('lets staff create a new household despite a CRM match and keeps the duplicate warning', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      const original = await createLead(testDb.db, {
        firstName: 'Alex',
        lastName: 'One',
        phone: '8015550600',
        programId: kids!.id,
        source: 'WALK_IN',
      }, actor)
      const { event, sessionA } = await publishedEvent(testDb.db, actor)
      const registration = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Alex',
        lastName: 'Two',
        phone: '8015550600',
        participants: [{ firstName: 'Kiddo', sessionId: sessionA.id, age: 8 }],
      })
      await updateEventRegistrationLine(testDb.db, registration.lines[0]!.id, { attendance: 'ATTENDED' }, actor)
      const preview = await previewEventBatch(testDb.db, event.id)
      expect(preview.rows[0]?.outcome).toBe('MATCH')
      const forced = await previewEventBatch(testDb.db, event.id, { forceNewRegistrationIds: [registration.id] })
      expect(forced.rows[0]?.outcome).toBe('NEW')
      expect(forced.newHouseholds).toBe(1)
      const result = await executeEventBatch(testDb.db, event.id, { forceNewRegistrationIds: [registration.id] }, actor)
      expect(result.createdLeadIds).toHaveLength(1)
      expect(result.createdLeadIds[0]).not.toBe(original.id)
      const created = await getLead(testDb.db, result.createdLeadIds[0]!)
      expect(created.duplicates?.some(item => item.id === original.id)).toBe(true)
    } finally {
      await testDb.close()
    }
  })
})
