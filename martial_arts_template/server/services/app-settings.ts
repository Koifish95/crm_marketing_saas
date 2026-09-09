import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { appSettings, users } from '../database/schema'
import {
  COMPENSATION_TRACKED_OWNER_DESCRIPTION,
  COMPENSATION_TRACKED_OWNER_KEY,
  COMPENSATION_TRACKED_OWNER_LABEL,
} from '../../shared/utils/compensation'
import {
  ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT,
  ALLOW_EARLY_TRIAL_OUTCOMES_DESCRIPTION,
  ALLOW_EARLY_TRIAL_OUTCOMES_KEY,
  ALLOW_EARLY_TRIAL_OUTCOMES_LABEL,
} from '../../shared/utils/trial-outcomes'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import { recordSecurityEvent } from './security-audit'

export {
  ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT,
  ALLOW_EARLY_TRIAL_OUTCOMES_DESCRIPTION,
  ALLOW_EARLY_TRIAL_OUTCOMES_KEY,
  ALLOW_EARLY_TRIAL_OUTCOMES_LABEL,
}

export type AppSettingsView = {
  allowEarlyTrialOutcomes: boolean
  key: string
  label: string
  description: string
  trackedAcquisitionOwnerUserId: number | null
  trackedAcquisitionOwner: { id: number, displayName: string } | null
  trackedAcquisitionOwnerKey: string
  trackedAcquisitionOwnerLabel: string
  trackedAcquisitionOwnerDescription: string
}

function serializeBoolean(value: boolean) {
  return value ? 'true' : 'false'
}

function parseBooleanSetting(value: string | undefined, fallback: boolean) {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return fallback
}

function parseUserIdSetting(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== trimmed) {
    return null
  }
  return parsed
}

async function readSettingRow(db: Database, key: string) {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)
  return row
}

async function upsertSetting(
  db: Database,
  key: string,
  value: string,
  actorUserId: number | null,
  nowMs = utcNowMs(),
) {
  const existing = await readSettingRow(db, key)
  const stamp = new Date(nowMs)
  if (existing) {
    await db.update(appSettings)
      .set({
        value,
        updatedAt: stamp,
        updatedByUserId: actorUserId,
      })
      .where(eq(appSettings.key, key))
    return
  }
  await db.insert(appSettings).values({
    key,
    value,
    updatedAt: stamp,
    updatedByUserId: actorUserId,
  })
}

async function activeUserPreview(db: Database, userId: number | null) {
  if (!userId) {
    return null
  }
  const [row] = await db.select({
    id: users.id,
    displayName: users.displayName,
    active: users.active,
  }).from(users).where(eq(users.id, userId)).limit(1)
  if (!row || !row.active) {
    return null
  }
  return { id: row.id, displayName: row.displayName }
}

export async function ensureDefaultAppSettings(db: Database, nowMs = utcNowMs()) {
  const stamp = new Date(nowMs)
  const keys = [
    { key: ALLOW_EARLY_TRIAL_OUTCOMES_KEY, value: serializeBoolean(ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT) },
    { key: COMPENSATION_TRACKED_OWNER_KEY, value: '' },
  ]
  for (const item of keys) {
    const existing = await readSettingRow(db, item.key)
    if (existing) {
      continue
    }
    await db.insert(appSettings).values({
      key: item.key,
      value: item.value,
      updatedAt: stamp,
      updatedByUserId: null,
    }).onConflictDoNothing()
  }
}

export async function getAllowEarlyTrialOutcomes(db: Database) {
  await ensureDefaultAppSettings(db)
  const row = await readSettingRow(db, ALLOW_EARLY_TRIAL_OUTCOMES_KEY)
  return parseBooleanSetting(row?.value, ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT)
}

export async function getTrackedAcquisitionOwnerUserId(db: Database) {
  await ensureDefaultAppSettings(db)
  const row = await readSettingRow(db, COMPENSATION_TRACKED_OWNER_KEY)
  const userId = parseUserIdSetting(row?.value)
  const owner = await activeUserPreview(db, userId)
  return owner?.id ?? null
}

export async function getAppSettings(db: Database): Promise<AppSettingsView> {
  const allowEarlyTrialOutcomes = await getAllowEarlyTrialOutcomes(db)
  const trackedAcquisitionOwnerUserId = await getTrackedAcquisitionOwnerUserId(db)
  const trackedAcquisitionOwner = await activeUserPreview(db, trackedAcquisitionOwnerUserId)
  return {
    allowEarlyTrialOutcomes,
    key: ALLOW_EARLY_TRIAL_OUTCOMES_KEY,
    label: ALLOW_EARLY_TRIAL_OUTCOMES_LABEL,
    description: ALLOW_EARLY_TRIAL_OUTCOMES_DESCRIPTION,
    trackedAcquisitionOwnerUserId,
    trackedAcquisitionOwner,
    trackedAcquisitionOwnerKey: COMPENSATION_TRACKED_OWNER_KEY,
    trackedAcquisitionOwnerLabel: COMPENSATION_TRACKED_OWNER_LABEL,
    trackedAcquisitionOwnerDescription: COMPENSATION_TRACKED_OWNER_DESCRIPTION,
  }
}

export async function updateAllowEarlyTrialOutcomes(
  db: Database,
  value: boolean,
  actor: SessionUser,
  audit?: { ip?: string | null, userAgent?: string | null },
) {
  const previous = await getAllowEarlyTrialOutcomes(db)
  if (previous === value) {
    return getAppSettings(db)
  }

  await upsertSetting(db, ALLOW_EARLY_TRIAL_OUTCOMES_KEY, serializeBoolean(value), actor.id)

  await recordSecurityEvent(db, {
    action: 'APP_SETTING_CHANGED',
    result: 'SUCCESS',
    actorUserId: actor.id,
    ip: audit?.ip,
    userAgent: audit?.userAgent,
    metadata: {
      key: ALLOW_EARLY_TRIAL_OUTCOMES_KEY,
      previousValue: previous,
      newValue: value,
    },
  })

  return getAppSettings(db)
}

export async function updateTrackedAcquisitionOwner(
  db: Database,
  userId: number | null,
  actor: SessionUser,
  audit?: { ip?: string | null, userAgent?: string | null },
) {
  const previous = await getTrackedAcquisitionOwnerUserId(db)
  let next: number | null = null
  if (userId != null) {
    const owner = await activeUserPreview(db, userId)
    if (!owner) {
      throw new DomainError('Choose an active staff user for tracked-acquisition credit.')
    }
    next = owner.id
  }
  if (previous === next) {
    return getAppSettings(db)
  }

  await upsertSetting(db, COMPENSATION_TRACKED_OWNER_KEY, next ? String(next) : '', actor.id)

  await recordSecurityEvent(db, {
    action: 'APP_SETTING_CHANGED',
    result: 'SUCCESS',
    actorUserId: actor.id,
    ip: audit?.ip,
    userAgent: audit?.userAgent,
    metadata: {
      key: COMPENSATION_TRACKED_OWNER_KEY,
      previousValue: previous,
      newValue: next,
    },
  })

  return getAppSettings(db)
}

export async function updateAppSettings(
  db: Database,
  input: { allowEarlyTrialOutcomes?: boolean, trackedAcquisitionOwnerUserId?: number | null },
  actor: SessionUser,
  audit?: { ip?: string | null, userAgent?: string | null },
) {
  if (input.allowEarlyTrialOutcomes !== undefined) {
    await updateAllowEarlyTrialOutcomes(db, input.allowEarlyTrialOutcomes, actor, audit)
  }
  if (input.trackedAcquisitionOwnerUserId !== undefined) {
    await updateTrackedAcquisitionOwner(db, input.trackedAcquisitionOwnerUserId, actor, audit)
  }
  return getAppSettings(db)
}
