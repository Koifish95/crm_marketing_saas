import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { followUpTasks, programs, users } from '../../server/database/schema'
import {
  addEventSession,
  createAcquisitionEvent,
  executeEventBatch,
  registerPublicEvent,
  updateAcquisitionEvent,
  updateEventRegistrationLine,
} from '../../server/services/events'
import { addLeadLineToHousehold } from '../../server/services/lead-lines'
import { createLead, getLead } from '../../server/services/leads'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'
import {
  programId,
  scheduleValidTrialForLine,
} from '../m8/helpers/scenarios'

function actorFrom(row: { id: number, email: string, displayName: string, role: string }) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as 'ADMIN',
    mustChangePassword: false,
  }
}

describe('M9 event then intro follow-up consolidation', () => {
  it('does not open a second call when intros are scheduled after Event process', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      const event = await createAcquisitionEvent(testDb.db, {
        title: 'Wrestling Tournament',
        programId: kids!.id,
      }, actor)
      const session = await addEventSession(testDb.db, event.id, {
        name: 'Ninjas Bracket',
        startsAt: new Date(utcNowMs() + 86_400_000),
        programId: kids!.id,
      })
      await updateAcquisitionEvent(testDb.db, event.id, { status: 'PUBLISHED' })
      const registration = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Josh',
        lastName: 'Coy',
        phone: '8015556789',
        participants: [{ firstName: 'Jaime', lastName: 'Coy', age: 8, sessionId: session.id }],
      })
      await updateEventRegistrationLine(testDb.db, registration.lines[0]!.id, { attendance: 'ATTENDED' }, actor)
      const result = await executeEventBatch(testDb.db, event.id, {}, actor)
      expect(result.createdLeadIds).toHaveLength(1)

      const afterProcess = await getLead(testDb.db, result.createdLeadIds[0]!)
      const eventCalls = afterProcess.followUpTasks.filter(task => task.status === 'PENDING')
      expect(eventCalls).toHaveLength(1)
      expect(eventCalls[0]?.purpose).toBe('EVENT_FOLLOW_UP')
      expect(eventCalls[0]?.confirmationIntros ?? []).toHaveLength(0)

      const child = afterProcess.lines.find(line => line.relationship === 'CHILD')!
      const adultProgram = await programId(testDb.db, 'ADULT_BJJ')
      const self = await addLeadLineToHousehold(testDb.db, afterProcess.id, {
        relationship: 'SELF',
        firstName: afterProcess.firstName,
        lastName: afterProcess.lastName,
        programId: adultProgram,
      })
      await scheduleValidTrialForLine(testDb.db, afterProcess.id, self.id, 'ADULT_BJJ')
      await scheduleValidTrialForLine(testDb.db, afterProcess.id, child.id, 'KIDS_BJJ')

      const afterTrials = await getLead(testDb.db, afterProcess.id)
      const pending = afterTrials.followUpTasks.filter(task => task.status === 'PENDING')
      expect(pending).toHaveLength(1)
      expect(pending[0]?.purpose).toBe('INITIAL_SCHEDULE')
      expect(pending[0]?.confirmationIntros?.map(intro => intro.firstName).sort()).toEqual(['Jaime', 'Josh'])
      const leftoverEvent = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.leadId, afterProcess.id))
      expect(leftoverEvent.filter(task => task.purpose === 'EVENT_FOLLOW_UP' && task.status === 'PENDING')).toHaveLength(0)
    } finally {
      await testDb.close()
    }
  })

  it('attaches Event process onto an existing intro confirmation instead of a second call', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      const adultProgram = await programId(testDb.db, 'ADULT_BJJ')
      const household = await createLead(testDb.db, {
        firstName: 'Josh',
        lastName: 'Walkin',
        phone: '8015556790',
        programId: adultProgram,
        source: 'WALK_IN',
      }, actor)
      await scheduleValidTrialForLine(testDb.db, household.id, household.lines[0]!.id, 'ADULT_BJJ')
      const event = await createAcquisitionEvent(testDb.db, {
        title: 'Later Open House',
        programId: kids!.id,
      }, actor)
      const session = await addEventSession(testDb.db, event.id, {
        name: 'Saturday',
        startsAt: new Date(utcNowMs() + 86_400_000),
        programId: kids!.id,
      })
      await updateAcquisitionEvent(testDb.db, event.id, { status: 'PUBLISHED' })
      const registration = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Josh',
        lastName: 'Walkin',
        phone: '8015556790',
        participants: [{ firstName: 'Jaime', lastName: 'Walkin', age: 8, sessionId: session.id }],
      })
      await updateEventRegistrationLine(testDb.db, registration.lines[0]!.id, { attendance: 'ATTENDED' }, actor)
      await executeEventBatch(testDb.db, event.id, {}, actor)

      const after = await getLead(testDb.db, household.id)
      const pending = after.followUpTasks.filter(task => task.status === 'PENDING')
      expect(pending).toHaveLength(1)
      expect(pending[0]?.purpose).toBe('INITIAL_SCHEDULE')
      expect(after.followUpTasks.filter(task => task.purpose === 'EVENT_FOLLOW_UP')).toHaveLength(0)
    } finally {
      await testDb.close()
    }
  })
})
