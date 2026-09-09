import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { followUpTasks, leads, programs, trials, users } from '../../server/database/schema'
import { listPublicSlots } from '../../server/services/availability'
import * as followUp from '../../server/services/follow-up'
import {
  cancelFollowUpTask,
  completeFollowUpTask,
  createManualFollowUpTask,
  ensureInitialFollowUpTask,
  followUpDashboard,
  listFollowUpTasks,
} from '../../server/services/follow-up'
import { createLead, createTrial, rescheduleTrial, setTrialOutcome } from '../../server/services/leads'
import { bookPublicTrial } from '../../server/services/public-trial'
import type { SessionUser } from '../../server/services/authorization'
import { followUpDueAt, followUpDueState } from '../../shared/utils/follow-up'
import { denverYmd, denverWallToUtc } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

const MONDAY = Date.parse('2026-08-31T21:00:00.000Z')
const TUESDAY_MORNING = Date.parse('2026-09-01T16:00:00.000Z')
const THURSDAY = Date.parse('2026-09-03T16:00:00.000Z')
const FRIDAY = Date.parse('2026-09-04T16:00:00.000Z')
const SATURDAY = Date.parse('2026-09-05T16:00:00.000Z')
const SUNDAY = Date.parse('2026-09-06T16:00:00.000Z')

afterEach(() => {
  vi.restoreAllMocks()
})

async function adultProgramId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [row] = await db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
  return row!.id
}

async function adminActor(db: Awaited<ReturnType<typeof openTestDatabase>>['db']): Promise<SessionUser> {
  const [admin] = await db.select().from(users).where(eq(users.username, 'admin'))
  return { id: admin!.id, email: admin!.email, displayName: admin!.displayName, role: 'ADMIN' }
}

function scheduledTrial(lead: { trials: Array<{ id: number, status: string }> }) {
  return lead.trials.find(trial => trial.status === 'SCHEDULED')!
}

describe('M5 follow-up due dates', () => {
  it('places the deadline at 5:00 PM Denver two weekdays later', () => {
    expect(denverYmd(followUpDueAt(MONDAY).getTime())).toBe('2026-09-02')
    expect(followUpDueAt(MONDAY).getTime()).toBe(denverWallToUtc('2026-09-02', 17 * 60).getTime())
    expect(denverYmd(followUpDueAt(THURSDAY).getTime())).toBe('2026-09-07')
    expect(denverYmd(followUpDueAt(FRIDAY).getTime())).toBe('2026-09-08')
    expect(denverYmd(followUpDueAt(SATURDAY).getTime())).toBe('2026-09-08')
    expect(denverYmd(followUpDueAt(SUNDAY).getTime())).toBe('2026-09-08')
  })
})

describe('M5 pending due-state buckets', () => {
  const today3pm = denverWallToUtc('2026-09-02', 15 * 60).getTime()
  const today5pm = denverWallToUtc('2026-09-02', 17 * 60).getTime()
  const today6pm = denverWallToUtc('2026-09-02', 18 * 60).getTime()
  const tomorrow5pm = denverWallToUtc('2026-09-03', 17 * 60).getTime()

  it('classifies a pending task due later today as due today only', () => {
    expect(followUpDueState(today5pm, today3pm)).toBe('DUE_TODAY')
  })

  it('classifies a pending task due earlier today as overdue only', () => {
    expect(followUpDueState(today5pm, today6pm)).toBe('OVERDUE')
  })

  it('classifies a pending task due tomorrow as upcoming only', () => {
    expect(followUpDueState(tomorrow5pm, today3pm)).toBe('UPCOMING')
  })

  it('uses America/Denver calendar dates, not UTC', () => {
    const now = Date.parse('2026-09-03T00:00:00.000Z')
    expect(denverYmd(now)).toBe('2026-09-02')
    expect(followUpDueState(denverWallToUtc('2026-09-03', 17 * 60).getTime(), now)).toBe('UPCOMING')
    expect(followUpDueState(denverWallToUtc('2026-09-02', 17 * 60).getTime(), now)).toBe('OVERDUE')
    expect(followUpDueState(denverWallToUtc('2026-09-02', 19 * 60).getTime(), now)).toBe('DUE_TODAY')
  })

  it('keeps queue filters and dashboard counts on the same mutually exclusive buckets', async () => {
    const testDb = await openTestDatabase()
    try {
      const programId = await adultProgramId(testDb.db)
      const lead = await createLead(testDb.db, {
        firstName: 'Buckets',
        phone: '8015550410',
        programId,
        source: 'WALK_IN',
      })
      const dueFive = await createManualFollowUpTask(testDb.db, {
        leadId: lead.id,
        dueAt: new Date(today5pm),
      })
      const dueTomorrow = await createManualFollowUpTask(testDb.db, {
        leadId: lead.id,
        dueAt: new Date(tomorrow5pm),
      })

      const at3pm = {
        dueToday: await listFollowUpTasks(testDb.db, 'due_today', today3pm),
        overdue: await listFollowUpTasks(testDb.db, 'overdue', today3pm),
        upcoming: await listFollowUpTasks(testDb.db, 'upcoming', today3pm),
        dash: await followUpDashboard(testDb.db, today3pm),
      }
      expect(at3pm.dueToday.map(task => task.id)).toContain(dueFive.id)
      expect(at3pm.overdue.map(task => task.id)).not.toContain(dueFive.id)
      expect(at3pm.upcoming.map(task => task.id)).not.toContain(dueFive.id)
      expect(at3pm.upcoming.map(task => task.id)).toContain(dueTomorrow.id)
      expect(at3pm.dueToday.map(task => task.id)).not.toContain(dueTomorrow.id)
      expect(at3pm.overdue.map(task => task.id)).not.toContain(dueTomorrow.id)
      expect(at3pm.dash.dueToday).toBe(at3pm.dueToday.length)
      expect(at3pm.dash.overdue).toBe(at3pm.overdue.length)
      expect(at3pm.dash.upcoming).toBe(at3pm.upcoming.length)

      const at6pm = {
        dueToday: await listFollowUpTasks(testDb.db, 'due_today', today6pm),
        overdue: await listFollowUpTasks(testDb.db, 'overdue', today6pm),
        upcoming: await listFollowUpTasks(testDb.db, 'upcoming', today6pm),
        dash: await followUpDashboard(testDb.db, today6pm),
      }
      expect(at6pm.overdue.map(task => task.id)).toContain(dueFive.id)
      expect(at6pm.dueToday.map(task => task.id)).not.toContain(dueFive.id)
      expect(at6pm.upcoming.map(task => task.id)).not.toContain(dueFive.id)
      expect(at6pm.upcoming.map(task => task.id)).toContain(dueTomorrow.id)
      expect(at6pm.dueToday.map(task => task.id)).not.toContain(dueTomorrow.id)
      expect(at6pm.overdue.map(task => task.id)).not.toContain(dueTomorrow.id)
      expect(at6pm.dash.dueToday).toBe(at6pm.dueToday.length)
      expect(at6pm.dash.overdue).toBe(at6pm.overdue.length)
      expect(at6pm.dash.upcoming).toBe(at6pm.upcoming.length)

      const queued = [...at6pm.dueToday, ...at6pm.overdue, ...at6pm.upcoming].map(task => task.id)
      expect(new Set(queued).size).toBe(queued.length)
    } finally {
      await testDb.close()
    }
  })

  it('does not classify completed or cancelled tasks by dueAt', async () => {
    const testDb = await openTestDatabase()
    try {
      const programId = await adultProgramId(testDb.db)
      const actor = await adminActor(testDb.db)
      const lead = await createLead(testDb.db, {
        firstName: 'Closed',
        phone: '8015550411',
        programId,
        source: 'WALK_IN',
      })
      const completed = await createManualFollowUpTask(testDb.db, {
        leadId: lead.id,
        dueAt: new Date(today5pm),
      })
      const cancelled = await createManualFollowUpTask(testDb.db, {
        leadId: lead.id,
        dueAt: new Date(today5pm),
      })
      await completeFollowUpTask(testDb.db, completed.id, { outcome: 'REACHED' }, actor)
      await cancelFollowUpTask(testDb.db, cancelled.id)

      for (const now of [today3pm, today6pm]) {
        const dueToday = await listFollowUpTasks(testDb.db, 'due_today', now)
        const overdue = await listFollowUpTasks(testDb.db, 'overdue', now)
        const upcoming = await listFollowUpTasks(testDb.db, 'upcoming', now)
        const ids = [...dueToday, ...overdue, ...upcoming].map(task => task.id)
        expect(ids).not.toContain(completed.id)
        expect(ids).not.toContain(cancelled.id)
      }
    } finally {
      await testDb.close()
    }
  })
})

describe('M5 follow-up workflow', () => {
  it('creates a pending phone-call task from a public booking', async () => {
    const testDb = await openTestDatabase()
    try {
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const booked = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Jordan',
        lastName: 'Public',
        phone: '8015550300',
        slotId: slots[0]!.id,
      }, { nowMs: MONDAY })
      expect(booked.replayed).toBe(false)
      expect(booked.lead.status).toBe('TRIAL_SCHEDULED')
      const tasks = booked.lead.followUpTasks ?? []
      expect(tasks).toHaveLength(1)
      const task = tasks[0]!
      expect(task.type).toBe('PHONE_CALL')
      expect(task.status).toBe('PENDING')
      expect(task.purpose).toBe('INITIAL_SCHEDULE')
      expect(task.assignedUser).toBeNull()
      expect(task.trialId).toBe(scheduledTrial(booked.lead).id)
      expect(new Date(task.dueAt).getTime()).toBe(followUpDueAt(new Date(task.createdAt!).getTime()).getTime())
    } finally {
      await testDb.close()
    }
  })

  it('creates a pending phone-call task from an internal trial', async () => {
    const testDb = await openTestDatabase()
    try {
      const lead = await createLead(testDb.db, {
        firstName: 'Casey',
        phone: '8015550301',
        programId: await adultProgramId(testDb.db),
        source: 'WALK_IN',
      })
      const created = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(MONDAY + 86_400_000),
        label: 'Tuesday intro',
      }, undefined, { nowMs: MONDAY })
      const tasks = created.followUpTasks ?? []
      expect(tasks).toHaveLength(1)
      expect(tasks[0]!.type).toBe('PHONE_CALL')
      expect(tasks[0]!.status).toBe('PENDING')
      expect(new Date(tasks[0]!.dueAt).getTime()).toBe(followUpDueAt(MONDAY).getTime())
    } finally {
      await testDb.close()
    }
  })

  it('does not create a second initial task for the same trial', async () => {
    const testDb = await openTestDatabase()
    try {
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const key = randomUUID()
      const first = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Pat',
        lastName: 'Retry',
        phone: '8015550302',
        slotId: slots[0]!.id,
        idempotencyKey: key,
      }, { nowMs: MONDAY })
      const trialId = scheduledTrial(first.lead).id
      await ensureInitialFollowUpTask(testDb.db, { leadId: first.lead.id, trialId })
      const second = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Pat',
        lastName: 'Retry',
        phone: '8015550302',
        slotId: slots[0]!.id,
        idempotencyKey: key,
      }, { nowMs: MONDAY })
      expect(second.replayed).toBe(true)
      const rows = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.leadId, first.lead.id))
      expect(rows).toHaveLength(1)
      expect(rows[0]!.status).toBe('PENDING')
    } finally {
      await testDb.close()
    }
  })

  it('keeps the pending household confirmation and retargets it on reschedule', async () => {
    const testDb = await openTestDatabase()
    try {
      const lead = await createLead(testDb.db, {
        firstName: 'Alex',
        phone: '8015550303',
        programId: await adultProgramId(testDb.db),
        source: 'WALK_IN',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const gi = slots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      const noGi = slots.find(slot => slot.date === '2026-09-01' && slot.name.includes('No-Gi') && slot.startMinute === 18 * 60)!
      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(gi.scheduledAt),
        label: `${gi.name} · ${gi.date}`,
      }, undefined, { nowMs: MONDAY })
      const original = scheduledTrial(scheduled)
      const originalTask = scheduled.followUpTasks!.find(task => task.purpose === 'INITIAL_SCHEDULE')!
      const moved = await rescheduleTrial(testDb.db, original.id, { slotId: noGi.id }, undefined, { nowMs: TUESDAY_MORNING })
      const next = scheduledTrial(moved)
      const kept = moved.followUpTasks?.find(task => task.id === originalTask.id)
      expect(kept?.status).toBe('PENDING')
      expect(kept?.trialId).toBe(next.id)
      expect(new Date(kept!.dueAt).getTime()).toBe(followUpDueAt(MONDAY).getTime())
      expect(moved.followUpTasks?.filter(task => task.purpose === 'INITIAL_SCHEDULE' && task.status === 'PENDING')).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('keeps a completed call when the trial is later rescheduled', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const lead = await createLead(testDb.db, {
        firstName: 'Sam',
        phone: '8015550304',
        programId: await adultProgramId(testDb.db),
        source: 'PHONE',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const gi = slots.find(slot => slot.date === '2026-08-31' && slot.name.includes('with Gi') && slot.startMinute === 18 * 60)!
      const noGi = slots.find(slot => slot.date === '2026-09-01' && slot.name.includes('No-Gi') && slot.startMinute === 18 * 60)!
      const scheduled = await createTrial(testDb.db, lead.id, {
        scheduledAt: new Date(gi.scheduledAt),
        label: `${gi.name} · ${gi.date}`,
      }, undefined, { nowMs: MONDAY })
      const original = scheduledTrial(scheduled)
      const originalTask = scheduled.followUpTasks!.find(task => task.trialId === original.id)!
      await completeFollowUpTask(testDb.db, originalTask.id, {
        outcome: 'REACHED',
        notes: 'Confirmed Tuesday class.',
      }, actor)
      const moved = await rescheduleTrial(testDb.db, original.id, { slotId: noGi.id }, undefined, { nowMs: TUESDAY_MORNING })
      const kept = moved.followUpTasks?.find(task => task.id === originalTask.id)
      const next = scheduledTrial(moved)
      const created = moved.followUpTasks?.find(task => task.trialId === next.id)
      expect(kept?.status).toBe('COMPLETED')
      expect(kept?.outcome).toBe('REACHED')
      expect(created?.status).toBe('PENDING')
    } finally {
      await testDb.close()
    }
  })

  it('cancels the pending confirmation call when a trial is cancelled, attended, or a no-show', async () => {
    const testDb = await openTestDatabase()
    try {
      const programId = await adultProgramId(testDb.db)
      const cancelledLead = await createLead(testDb.db, {
        firstName: 'Cancel',
        phone: '8015550305',
        programId,
        source: 'WEBSITE',
      })
      const attendedLead = await createLead(testDb.db, {
        firstName: 'Attend',
        phone: '8015550306',
        programId,
        source: 'WEBSITE',
      })
      const noShowLead = await createLead(testDb.db, {
        firstName: 'NoShow',
        phone: '8015550307',
        programId,
        source: 'WEBSITE',
      })
      const cancelled = await createTrial(testDb.db, cancelledLead.id, { scheduledAt: new Date(MONDAY) }, undefined, { nowMs: MONDAY })
      const attended = await createTrial(testDb.db, attendedLead.id, { scheduledAt: new Date(MONDAY) }, undefined, { nowMs: MONDAY })
      const noShow = await createTrial(testDb.db, noShowLead.id, { scheduledAt: new Date(MONDAY) }, undefined, { nowMs: MONDAY })

      const afterCancel = await setTrialOutcome(testDb.db, scheduledTrial(cancelled).id, { status: 'CANCELLED' })
      const afterAttend = await setTrialOutcome(testDb.db, scheduledTrial(attended).id, { status: 'ATTENDED' })
      const afterNoShow = await setTrialOutcome(testDb.db, scheduledTrial(noShow).id, { status: 'NO_SHOW' })

      expect(afterCancel.followUpTasks?.[0]?.status).toBe('CANCELLED')
      expect(afterAttend.followUpTasks?.[0]?.status).toBe('CANCELLED')
      expect(afterNoShow.followUpTasks?.[0]?.status).toBe('CANCELLED')
      expect(afterNoShow.status).toBe('NO_SHOW')
      const extra = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.leadId, noShowLead.id))
      expect(extra).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('completes a call with an outcome, note, and completedAt', async () => {
    const testDb = await openTestDatabase()
    try {
      const actor = await adminActor(testDb.db)
      const lead = await createLead(testDb.db, {
        firstName: 'Riley',
        phone: '8015550308',
        programId: await adultProgramId(testDb.db),
        source: 'WALK_IN',
      })
      const created = await createTrial(testDb.db, lead.id, { scheduledAt: new Date(MONDAY) }, undefined, { nowMs: MONDAY })
      const task = created.followUpTasks![0]!
      const completed = await completeFollowUpTask(testDb.db, task.id, {
        outcome: 'LEFT_VOICEMAIL',
        notes: 'Left a voicemail about gi rental.',
      }, actor)
      expect(completed.status).toBe('COMPLETED')
      expect(completed.outcome).toBe('LEFT_VOICEMAIL')
      expect(completed.notes).toBe('Left a voicemail about gi rental.')
      expect(completed.completedAt).toBeTruthy()
      expect(completed.completedBy?.id).toBe(actor.id)
      expect(completed.assignedUser).toBeNull()
      expect(created.status).toBe('TRIAL_SCHEDULED')
      const still = await testDb.db.select().from(trials).where(eq(trials.leadId, lead.id))
      expect(still[0]?.status).toBe('SCHEDULED')
    } finally {
      await testDb.close()
    }
  })

  it('rolls back public booking if follow-up creation fails', async () => {
    const testDb = await openTestDatabase()
    const spy = vi.spyOn(followUp, 'ensureInitialFollowUpTask').mockRejectedValueOnce(new Error('forced follow-up failure'))
    try {
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      await expect(bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Rollback',
        lastName: 'Task',
        phone: '8015550309',
        slotId: slots[0]!.id,
      }, { nowMs: MONDAY })).rejects.toThrow('forced follow-up failure')
      const leftover = await testDb.db.select().from(leads).where(eq(leads.phone, '8015550309'))
      expect(leftover).toHaveLength(0)
      const leftoverTrials = await testDb.db.select().from(trials)
      expect(leftoverTrials).toHaveLength(0)
      const leftoverTasks = await testDb.db.select().from(followUpTasks)
      expect(leftoverTasks).toHaveLength(0)
    } finally {
      spy.mockRestore()
      await testDb.close()
    }
  })

  it('lists overdue pending work before later due dates', async () => {
    const testDb = await openTestDatabase()
    try {
      const programId = await adultProgramId(testDb.db)
      const first = await createLead(testDb.db, {
        firstName: 'Early',
        phone: '8015550310',
        programId,
        source: 'WALK_IN',
      })
      const second = await createLead(testDb.db, {
        firstName: 'Later',
        phone: '8015550311',
        programId,
        source: 'WALK_IN',
      })
      await createTrial(testDb.db, first.id, { scheduledAt: new Date(MONDAY) }, undefined, { nowMs: MONDAY })
      await createTrial(testDb.db, second.id, { scheduledAt: new Date(MONDAY) }, undefined, { nowMs: FRIDAY })
      const now = denverWallToUtc('2026-09-03', 18 * 60).getTime()
      const open = await listFollowUpTasks(testDb.db, 'open', now)
      expect(open[0]!.lead?.firstName).toBe('Early')
      expect(open[0]!.dueState).toBe('OVERDUE')
      expect(open[1]!.lead?.firstName).toBe('Later')
    } finally {
      await testDb.close()
    }
  })
})
