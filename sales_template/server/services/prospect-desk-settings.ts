import { ensureAppSettings, readAppSetting, upsertAppSetting } from '@crm/core/server/services/app-settings'
import type { Database } from '../database'
import { getDatabaseUrl } from '../database'
import {
  PROSPECT_DESK_SETTING_KEY,
  baseProspectDeskConfig,
  isLocalDogfoodDatabase,
  normalizeProspectDeskConfig,
  publicProspectDeskConfig,
  type ProspectDeskConfig,
  type PublicProspectDeskConfig,
} from '../../shared/utils/prospect-desk'

function defaultsFor(databaseUrl = getDatabaseUrl()) {
  return {
    ...baseProspectDeskConfig(),
    enabled: isLocalDogfoodDatabase(databaseUrl),
  }
}

export async function readProspectDeskConfig(db: Database, databaseUrl = getDatabaseUrl()): Promise<ProspectDeskConfig> {
  const defaults = defaultsFor(databaseUrl)
  await ensureAppSettings(db, [{
    key: PROSPECT_DESK_SETTING_KEY,
    value: JSON.stringify(defaults),
  }])
  const row = await readAppSetting(db, PROSPECT_DESK_SETTING_KEY)
  try {
    const parsed = row ? JSON.parse(row.value) as Partial<ProspectDeskConfig> : defaults
    return normalizeProspectDeskConfig({ ...defaults, ...parsed, mailboxPassword: parsed.mailboxPassword ?? defaults.mailboxPassword }, defaults)
  } catch {
    return defaults
  }
}

export async function writeProspectDeskConfig(
  db: Database,
  input: Partial<ProspectDeskConfig> & { mailboxPassword?: string },
  actorUserId: number | null,
): Promise<PublicProspectDeskConfig> {
  const current = await readProspectDeskConfig(db)
  const password = input.mailboxPassword?.trim()
    ? input.mailboxPassword
    : current.mailboxPassword
  const next = normalizeProspectDeskConfig({
    ...current,
    ...input,
    mailboxPassword: password,
    senderPaused: current.senderPaused,
    senderPausedReason: current.senderPausedReason,
    templates: input.templates ?? current.templates,
    practiceStates: input.practiceStates ?? current.practiceStates,
  })
  await upsertAppSetting(db, PROSPECT_DESK_SETTING_KEY, JSON.stringify(next), actorUserId)
  return publicProspectDeskConfig(next)
}

export async function saveProspectDeskInternal(db: Database, config: ProspectDeskConfig, actorUserId: number | null) {
  const next = normalizeProspectDeskConfig(config)
  await upsertAppSetting(db, PROSPECT_DESK_SETTING_KEY, JSON.stringify(next), actorUserId)
  return next
}

export function toPublicProspectDeskConfig(config: ProspectDeskConfig) {
  return publicProspectDeskConfig(config)
}
