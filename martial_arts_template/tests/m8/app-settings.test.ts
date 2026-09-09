import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb } from '../../server/database'
import { programs, securityEvents, users } from '../../server/database/schema'
import {
  getAllowEarlyTrialOutcomes,
  getAppSettings,
  updateAllowEarlyTrialOutcomes,
  updateTrackedAcquisitionOwner,
} from '../../server/services/app-settings'
import { DomainError } from '../../server/services/errors'
import {
  createLead,
  createTrial,
  getLead,
  rescheduleTrial,
  setTrialOutcome,
} from '../../server/services/leads'
import { listPublicSlots } from '../../server/services/availability'
import { seedDatabase } from '../../drizzle/seed'
import type { SessionUser } from '../../server/services/authorization'
import { householdDisplayStatus } from '../../shared/utils/labels'
import { denverWallToUtc } from '../../shared/utils/time'
import {
  ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT,
  ALLOW_EARLY_TRIAL_OUTCOMES_KEY,
  EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE,
  INVALID_TRIAL_OUTCOME_MESSAGE,
  mayRecordTrialOutcome,
} from '../../shared/utils/trial-outcomes'
import { openTestDatabase } from '../helpers/db'

const NOW = Date.parse('2026-09-02T18:00:00.000Z')
const FUTURE = NOW + 3_600_000
const PAST = NOW - 3_600_000
const MONDAY = Date.parse('2026-08-31T21:00:00.000Z')

async function adultId(db: Awaited<ReturnType<typeof openTestDatabase>>['db']) {
  const [row] = await db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
  return row!.id
}

async function adminActor(db: Awaited<ReturnType<typeof openTestDatabase>>['db']): Promise<SessionUser> {
  const [row] = await db.select().from(users).where(eq(users.username, 'admin'))
  return {
    id: row!.id,
    email: row!.email,
    displayName: row!.displayName,
    role: row!.role,
    mustChangePassword: false,
  }
}

async function scheduledHousehold(
  db: Awaited<ReturnType<typeof openTestDatabase>>['db'],
  phone: string,
  scheduledAtMs: number,
) {
  const lead = await createLead(db, {
    firstName: 'EarlyOutcome',
    phone,
    programId: await adultId(db),
    source: 'WALK_IN',
  })
  const created = await createTrial(db, lead.id, {
    scheduledAt: new Date(scheduledAtMs),
    label: 'QA intro',
    leadLineId: lead.lines[0]!.id,
  }, undefined, { nowMs: NOW })
  const trial = created.trials.find(item => item.status === 'SCHEDULED')!
  return { lead: created, trial }
}

describe('allowEarlyTrialOutcomes setting', () => {
  it('defaults to ON and keeps an administrator value across a new service instance and re-seed', async () => {
    const testDb = await openTestDatabase()
    try {
      expect(ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT).toBe(true)
      const settings = await getAppSettings(testDb.db)
      expect(settings.key).toBe(ALLOW_EARLY_TRIAL_OUTCOMES_KEY)
      expect(settings.allowEarlyTrialOutcomes).toBe(true)

      const admin = await adminActor(testDb.db)
      await updateAllowEarlyTrialOutcomes(testDb.db, false, admin)
      expect(await getAllowEarlyTrialOutcomes(testDb.db)).toBe(false)

      const second = createDb(testDb.url)
      try {
        expect(await getAllowEarlyTrialOutcomes(second.db)).toBe(false)
      } finally {
        second.client.close()
      }

      await seedDatabase(testDb.url)
      expect(await getAllowEarlyTrialOutcomes(testDb.db)).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('records an audit event when ADMIN changes the setting', async () => {
    const testDb = await openTestDatabase()
    try {
      const admin = await adminActor(testDb.db)
      await updateAllowEarlyTrialOutcomes(testDb.db, false, admin, { ip: '127.0.0.1', userAgent: 'vitest' })
      const events = await testDb.db.select().from(securityEvents)
      const change = events.find(row => row.action === 'APP_SETTING_CHANGED')
      expect(change?.result).toBe('SUCCESS')
      expect(change?.actorUserId).toBe(admin.id)
      expect(change?.createdAt).toBeInstanceOf(Date)
      const metadata = JSON.parse(change?.metadata || '{}') as {
        key: string
        previousValue: boolean
        newValue: boolean
      }
      expect(metadata.key).toBe(ALLOW_EARLY_TRIAL_OUTCOMES_KEY)
      expect(metadata.previousValue).toBe(true)
      expect(metadata.newValue).toBe(false)

      await updateAllowEarlyTrialOutcomes(testDb.db, false, admin)
      const afterNoop = await testDb.db.select().from(securityEvents)
      expect(afterNoop.filter(row => row.action === 'APP_SETTING_CHANGED')).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })
})

describe('tracked-acquisition credit owner setting', () => {
  it('starts unset and stores an active staff user without guessing a default', async () => {
    const testDb = await openTestDatabase()
    try {
      const settings = await getAppSettings(testDb.db)
      expect(settings.trackedAcquisitionOwnerUserId).toBeNull()
      expect(settings.trackedAcquisitionOwner).toBeNull()
      expect(settings.trackedAcquisitionOwnerKey).toBe('compensation.tracked_acquisition_owner_user_id')

      const admin = await adminActor(testDb.db)
      const saved = await updateTrackedAcquisitionOwner(testDb.db, admin.id, admin)
      expect(saved.trackedAcquisitionOwnerUserId).toBe(admin.id)
      expect(saved.trackedAcquisitionOwner?.displayName).toBe(admin.displayName)

      await expect(updateTrackedAcquisitionOwner(testDb.db, 999_999, admin)).rejects.toThrow(DomainError)

      const cleared = await updateTrackedAcquisitionOwner(testDb.db, null, admin)
      expect(cleared.trackedAcquisitionOwnerUserId).toBeNull()
    } finally {
      await testDb.close()
    }
  })
})

describe('mayRecordTrialOutcome instants', () => {
  it('compares UTC instants, including America/Denver daylight-saving boundaries', () => {
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: true,
      scheduledAtMs: FUTURE,
      nowMs: NOW,
    })).toBe(true)
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: false,
      scheduledAtMs: FUTURE,
      nowMs: NOW,
    })).toBe(false)
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: false,
      scheduledAtMs: NOW,
      nowMs: NOW,
    })).toBe(true)
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: false,
      scheduledAtMs: PAST,
      nowMs: NOW,
    })).toBe(true)

    const springForward = denverWallToUtc('2026-03-08', 3 * 60).getTime()
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: false,
      scheduledAtMs: springForward,
      nowMs: springForward - 1,
    })).toBe(false)
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: false,
      scheduledAtMs: springForward,
      nowMs: springForward,
    })).toBe(true)

    const fallBack = denverWallToUtc('2026-11-01', 90).getTime()
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: false,
      scheduledAtMs: fallBack,
      nowMs: fallBack - 1,
    })).toBe(false)
    expect(mayRecordTrialOutcome({
      allowEarlyTrialOutcomes: false,
      scheduledAtMs: fallBack,
      nowMs: fallBack,
    })).toBe(true)
  })
})

describe('Trial Attended / No-show time gate', () => {
  it('allows early Attended and No-show when the setting is ON', async () => {
    const testDb = await openTestDatabase()
    try {
      const attended = await scheduledHousehold(testDb.db, '8015559101', FUTURE)
      const afterAttend = await setTrialOutcome(testDb.db, attended.trial.id, { status: 'ATTENDED' }, undefined, { nowMs: NOW })
      expect(afterAttend.trials.find(trial => trial.id === attended.trial.id)?.status).toBe('ATTENDED')

      const noShow = await scheduledHousehold(testDb.db, '8015559102', FUTURE)
      const afterNoShow = await setTrialOutcome(testDb.db, noShow.trial.id, { status: 'NO_SHOW' }, undefined, { nowMs: NOW })
      expect(afterNoShow.trials.find(trial => trial.id === noShow.trial.id)?.status).toBe('NO_SHOW')
    } finally {
      await testDb.close()
    }
  })

  it('rejects early Attended and No-show when the setting is OFF', async () => {
    const testDb = await openTestDatabase()
    try {
      await updateAllowEarlyTrialOutcomes(testDb.db, false, await adminActor(testDb.db))
      const attended = await scheduledHousehold(testDb.db, '8015559103', FUTURE)
      await expect(setTrialOutcome(testDb.db, attended.trial.id, { status: 'ATTENDED' }, undefined, { nowMs: NOW }))
        .rejects.toMatchObject({ message: EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE, statusCode: 400 })
      expect((await getLead(testDb.db, attended.lead.id, { nowMs: NOW })).trials[0]?.status).toBe('SCHEDULED')

      const noShow = await scheduledHousehold(testDb.db, '8015559104', FUTURE)
      await expect(setTrialOutcome(testDb.db, noShow.trial.id, { status: 'NO_SHOW' }, undefined, { nowMs: NOW }))
        .rejects.toMatchObject({ message: EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE, statusCode: 400 })
    } finally {
      await testDb.close()
    }
  })

  it('allows Attended and No-show at and after scheduledAt when the setting is OFF', async () => {
    const testDb = await openTestDatabase()
    try {
      await updateAllowEarlyTrialOutcomes(testDb.db, false, await adminActor(testDb.db))
      const atStart = await scheduledHousehold(testDb.db, '8015559105', NOW)
      const afterAt = await setTrialOutcome(testDb.db, atStart.trial.id, { status: 'ATTENDED' }, undefined, { nowMs: NOW })
      expect(afterAt.trials.find(trial => trial.id === atStart.trial.id)?.status).toBe('ATTENDED')

      const past = await scheduledHousehold(testDb.db, '8015559106', PAST)
      const afterPast = await setTrialOutcome(testDb.db, past.trial.id, { status: 'NO_SHOW' }, undefined, { nowMs: NOW })
      expect(afterPast.trials.find(trial => trial.id === past.trial.id)?.status).toBe('NO_SHOW')
    } finally {
      await testDb.close()
    }
  })

  it('uses Denver DST instants as the scheduledAt cutoff when the setting is OFF', async () => {
    const testDb = await openTestDatabase()
    try {
      await updateAllowEarlyTrialOutcomes(testDb.db, false, await adminActor(testDb.db))
      const scheduledAtMs = denverWallToUtc('2026-03-08', 3 * 60).getTime()
      const early = await scheduledHousehold(testDb.db, '8015559107', scheduledAtMs)
      await expect(setTrialOutcome(testDb.db, early.trial.id, { status: 'ATTENDED' }, undefined, { nowMs: scheduledAtMs - 1 }))
        .rejects.toBeInstanceOf(DomainError)

      const onTime = await scheduledHousehold(testDb.db, '8015559108', scheduledAtMs)
      const recorded = await setTrialOutcome(testDb.db, onTime.trial.id, { status: 'NO_SHOW' }, undefined, { nowMs: scheduledAtMs })
      expect(recorded.trials.find(trial => trial.id === onTime.trial.id)?.status).toBe('NO_SHOW')
    } finally {
      await testDb.close()
    }
  })

  it('keeps invalid lifecycle transitions blocked when the setting is ON', async () => {
    const testDb = await openTestDatabase()
    try {
      const cancelled = await scheduledHousehold(testDb.db, '8015559109', FUTURE)
      await setTrialOutcome(testDb.db, cancelled.trial.id, { status: 'CANCELLED' }, undefined, { nowMs: NOW })
      await expect(setTrialOutcome(testDb.db, cancelled.trial.id, { status: 'ATTENDED' }, undefined, { nowMs: NOW }))
        .rejects.toMatchObject({ message: INVALID_TRIAL_OUTCOME_MESSAGE })

      const attended = await scheduledHousehold(testDb.db, '8015559110', FUTURE)
      await setTrialOutcome(testDb.db, attended.trial.id, { status: 'ATTENDED' }, undefined, { nowMs: NOW })
      await expect(setTrialOutcome(testDb.db, attended.trial.id, { status: 'NO_SHOW' }, undefined, { nowMs: NOW }))
        .rejects.toMatchObject({ message: INVALID_TRIAL_OUTCOME_MESSAGE })
    } finally {
      await testDb.close()
    }
  })

  it('leaves reschedule and cancel available for a future Trial when the setting is OFF', async () => {
    const testDb = await openTestDatabase()
    try {
      await updateAllowEarlyTrialOutcomes(testDb.db, false, await adminActor(testDb.db))
      const toCancel = await scheduledHousehold(testDb.db, '8015559111', FUTURE)
      const cancelled = await setTrialOutcome(testDb.db, toCancel.trial.id, { status: 'CANCELLED' }, undefined, { nowMs: NOW })
      expect(cancelled.trials.find(trial => trial.id === toCancel.trial.id)?.status).toBe('CANCELLED')

      const household = await createLead(testDb.db, {
        firstName: 'RescheduleCase',
        phone: '8015559112',
        programId: await adultId(testDb.db),
        source: 'WALK_IN',
      })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      expect(slots.length).toBeGreaterThan(1)
      const first = await createTrial(testDb.db, household.id, {
        scheduledAt: new Date(slots[0]!.scheduledAt),
        label: slots[0]!.name,
        leadLineId: household.lines[0]!.id,
      }, undefined, { nowMs: MONDAY })
      const scheduled = first.trials.find(trial => trial.status === 'SCHEDULED')!
      const moved = await rescheduleTrial(testDb.db, scheduled.id, { slotId: slots[1]!.id }, undefined, { nowMs: MONDAY })
      expect(moved.trials.some(trial => trial.status === 'CANCELLED' && trial.id === scheduled.id)).toBe(true)
      expect(moved.trials.some(trial => trial.status === 'SCHEDULED' && trial.id !== scheduled.id)).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('exposes canRecordTrialOutcome for Lead Detail button visibility', async () => {
    const testDb = await openTestDatabase()
    try {
      const futureOn = await scheduledHousehold(testDb.db, '8015559113', FUTURE)
      const onLead = await getLead(testDb.db, futureOn.lead.id, { nowMs: NOW })
      expect(onLead.trials.find(trial => trial.id === futureOn.trial.id)?.canRecordTrialOutcome).toBe(true)
      expect(onLead.lines[0]?.trials.find(trial => trial.id === futureOn.trial.id)?.canRecordTrialOutcome).toBe(true)

      await updateAllowEarlyTrialOutcomes(testDb.db, false, await adminActor(testDb.db))
      const futureOff = await scheduledHousehold(testDb.db, '8015559114', FUTURE)
      const offLead = await getLead(testDb.db, futureOff.lead.id, { nowMs: NOW })
      expect(offLead.trials.find(trial => trial.id === futureOff.trial.id)?.canRecordTrialOutcome).toBe(false)

      const atStart = await scheduledHousehold(testDb.db, '8015559115', NOW)
      const atLead = await getLead(testDb.db, atStart.lead.id, { nowMs: NOW })
      expect(atLead.trials.find(trial => trial.id === atStart.trial.id)?.canRecordTrialOutcome).toBe(true)

      const past = await scheduledHousehold(testDb.db, '8015559116', PAST)
      const pastLead = await getLead(testDb.db, past.lead.id, { nowMs: NOW })
      expect(pastLead.trials.find(trial => trial.id === past.trial.id)?.canRecordTrialOutcome).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('updates the LeadLine and household derived status after Attended and No-show', async () => {
    const testDb = await openTestDatabase()
    try {
      const attended = await scheduledHousehold(testDb.db, '8015559117', FUTURE)
      const afterAttend = await setTrialOutcome(testDb.db, attended.trial.id, { status: 'ATTENDED' }, undefined, { nowMs: NOW })
      expect(afterAttend.lines[0]?.status).toBe('TRIAL_ATTENDED')
      expect(afterAttend.status).toBe('TRIAL_ATTENDED')
      expect(householdDisplayStatus(afterAttend).key).toBe('ACTIVE')

      const noShow = await scheduledHousehold(testDb.db, '8015559118', FUTURE)
      const afterNoShow = await setTrialOutcome(testDb.db, noShow.trial.id, { status: 'NO_SHOW' }, undefined, { nowMs: NOW })
      expect(afterNoShow.lines[0]?.status).toBe('NO_SHOW')
      expect(afterNoShow.status).toBe('NO_SHOW')
      expect(householdDisplayStatus(afterNoShow).key).toBe('ACTIVE')
    } finally {
      await testDb.close()
    }
  })
})
