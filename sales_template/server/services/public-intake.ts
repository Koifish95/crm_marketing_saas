import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import { ensureAppSettings, readAppSetting, upsertAppSetting } from '@crm/core/server/services/app-settings'
import type { Database } from '../database'
import {
  salesLeads,
  salesNotes,
  salesPublicSubmissions,
} from '../database/schema'
import {
  INTAKE_FIELD_IDS,
  PUBLIC_INTAKE_HONEYPOT_FIELD,
  PUBLIC_INTAKE_SETTING_KEY,
  REQUIRED_INTAKE_FIELD_IDS,
  type IntakeFieldId,
  isIntakeFieldId,
} from '../../shared/utils/catalog'
import { utcNowMs } from '../../shared/utils/time'
import {
  getCampaign,
  getSource,
  recordTrackingClick,
  resolveActiveTrackingLink,
  websiteOrganicSource,
} from './acquisition'
import { createLead } from './sales'

function now() {
  return new Date(utcNowMs())
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export type IntakeFieldConfig = {
  id: IntakeFieldId
  label: string
  visible: boolean
  required: boolean
  order: number
  helpText: string
}

export type PublicIntakeConfig = {
  enabled: boolean
  introText: string
  helpText: string
  submitLabel: string
  thankYouText: string
  unavailableText: string
  fields: IntakeFieldConfig[]
}

const DEFAULT_FIELD_LABELS: Record<IntakeFieldId, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  companyName: 'Company / business name',
  message: 'What do you need?',
}

export const DEFAULT_PUBLIC_INTAKE_CONFIG: PublicIntakeConfig = {
  enabled: false,
  introText: 'Tell us a little about yourself and we will follow up shortly.',
  helpText: '',
  submitLabel: 'Send inquiry',
  thankYouText: 'Thanks. We received your inquiry and will follow up shortly.',
  unavailableText: 'This inquiry form is not accepting submissions right now.',
  fields: INTAKE_FIELD_IDS.map((id, index) => ({
    id,
    label: DEFAULT_FIELD_LABELS[id],
    visible: true,
    required: (REQUIRED_INTAKE_FIELD_IDS as readonly string[]).includes(id),
    order: (index + 1) * 10,
    helpText: '',
  })),
}

function normalizeConfig(raw: unknown): PublicIntakeConfig {
  const source = (raw && typeof raw === 'object') ? raw as Partial<PublicIntakeConfig> : {}
  const byId = new Map((source.fields ?? []).map(field => [field.id, field]))
  const fields = INTAKE_FIELD_IDS.map((id, index) => {
    const incoming = byId.get(id)
    const requiredLocked = (REQUIRED_INTAKE_FIELD_IDS as readonly string[]).includes(id)
    return {
      id,
      label: incoming?.label?.trim() || DEFAULT_FIELD_LABELS[id],
      visible: incoming?.visible ?? true,
      required: requiredLocked ? true : Boolean(incoming?.required),
      order: Number.isInteger(incoming?.order) ? incoming!.order : (index + 1) * 10,
      helpText: incoming?.helpText?.trim() || '',
    }
  }).sort((a, b) => a.order - b.order)
  return {
    enabled: Boolean(source.enabled),
    introText: source.introText?.trim() || DEFAULT_PUBLIC_INTAKE_CONFIG.introText,
    helpText: source.helpText?.trim() || '',
    submitLabel: source.submitLabel?.trim() || DEFAULT_PUBLIC_INTAKE_CONFIG.submitLabel,
    thankYouText: source.thankYouText?.trim() || DEFAULT_PUBLIC_INTAKE_CONFIG.thankYouText,
    unavailableText: source.unavailableText?.trim() || DEFAULT_PUBLIC_INTAKE_CONFIG.unavailableText,
    fields,
  }
}

export async function ensurePublicIntakeConfig(db: Database) {
  await ensureAppSettings(db, [{
    key: PUBLIC_INTAKE_SETTING_KEY,
    value: JSON.stringify(DEFAULT_PUBLIC_INTAKE_CONFIG),
  }])
}

export async function readPublicIntakeConfig(db: Database): Promise<PublicIntakeConfig> {
  await ensurePublicIntakeConfig(db)
  const row = await readAppSetting(db, PUBLIC_INTAKE_SETTING_KEY)
  try {
    return normalizeConfig(row ? JSON.parse(row.value) : DEFAULT_PUBLIC_INTAKE_CONFIG)
  } catch {
    return DEFAULT_PUBLIC_INTAKE_CONFIG
  }
}

export async function writePublicIntakeConfig(
  db: Database,
  input: Partial<PublicIntakeConfig>,
  actorUserId: number | null,
) {
  const current = await readPublicIntakeConfig(db)
  const next = normalizeConfig({ ...current, ...input, fields: input.fields ?? current.fields })
  await upsertAppSetting(db, PUBLIC_INTAKE_SETTING_KEY, JSON.stringify(next), actorUserId)
  return next
}

export function publicIntakePresentation(config: PublicIntakeConfig) {
  return {
    enabled: config.enabled,
    introText: config.introText,
    helpText: config.helpText,
    submitLabel: config.submitLabel,
    thankYouText: config.thankYouText,
    unavailableText: config.unavailableText,
    honeypotField: PUBLIC_INTAKE_HONEYPOT_FIELD,
    fields: config.fields.filter(field => field.visible).map(field => ({
      id: field.id,
      label: field.label,
      required: field.required,
      order: field.order,
      helpText: field.helpText,
    })),
  }
}

function normalizeEmail(value: string | null | undefined) {
  return blankToNull(value)?.toLowerCase() ?? null
}

function normalizePhone(value: string | null | undefined) {
  const trimmed = blankToNull(value)
  if (!trimmed) {
    return null
  }
  return trimmed.replace(/\D+/g, '') || null
}

async function findPossibleDuplicate(db: Database, email: string | null, phone: string | null) {
  if (!email && !phone) {
    return null
  }
  const rows = await db.select().from(salesLeads)
  return rows.find((row) => {
    const rowEmail = normalizeEmail(row.email)
    const rowPhone = normalizePhone(row.phone)
    return (email && rowEmail === email) || (phone && rowPhone && rowPhone === phone)
  }) ?? null
}

async function loadSubmission(db: Database, key: string) {
  const [row] = await db.select().from(salesPublicSubmissions)
    .where(eq(salesPublicSubmissions.idempotencyKey, key))
    .limit(1)
  return row ?? null
}

export async function submitPublicIntake(db: Database, input: {
  token?: string | null
  idempotencyKey?: string | null
  honeypot?: string | null
  values: Partial<Record<IntakeFieldId, string>>
}) {
  const config = await readPublicIntakeConfig(db)
  if (blankToNull(input.honeypot)) {
    return {
      ok: true as const,
      replay: false,
      ignored: true,
      thankYouText: config.thankYouText,
    }
  }
  if (!config.enabled) {
    throw new DomainError(config.unavailableText, 403)
  }

  const idempotencyKey = blankToNull(input.idempotencyKey) || randomUUID()
  const existing = await loadSubmission(db, idempotencyKey)
  if (existing) {
    return {
      ok: true as const,
      replay: true,
      ignored: false,
      thankYouText: config.thankYouText,
    }
  }

  const values: Partial<Record<IntakeFieldId, string>> = {}
  for (const [key, value] of Object.entries(input.values)) {
    if (isIntakeFieldId(key)) {
      values[key] = value
    }
  }
  for (const field of config.fields) {
    const provided = blankToNull(values[field.id])
    if (!field.visible) {
      continue
    }
    if (field.required && !provided) {
      throw new DomainError(`${field.label} is required.`)
    }
  }

  const firstName = blankToNull(values.firstName)
  const lastName = blankToNull(values.lastName)
  const email = blankToNull(values.email)
  if (!firstName || !lastName || !email) {
    throw new DomainError('A valid inquiry needs a first name, last name, and email.')
  }

  let sourceId: number
  let campaignId: number | null = null
  let capturedTrackingLinkId: number | null = null
  let capturedTrackingLinkLabel: string | null = null
  let sourceName: string
  let campaignName: string | null = null
  if (blankToNull(input.token)) {
    const link = await resolveActiveTrackingLink(db, input.token!)
    const source = await getSource(db, link.sourceId)
    const campaign = await getCampaign(db, link.campaignId)
    sourceId = source.id
    campaignId = campaign.id
    capturedTrackingLinkId = link.id
    capturedTrackingLinkLabel = link.label
    sourceName = source.name
    campaignName = campaign.name
  } else {
    const organic = await websiteOrganicSource(db)
    sourceId = organic.id
    sourceName = organic.name
  }

  const capturedAt = now()
  const duplicate = await findPossibleDuplicate(db, normalizeEmail(email), normalizePhone(values.phone))
  const lead = await createLead(db, {
    displayName: `${firstName} ${lastName}`.trim(),
    email,
    phone: values.phone,
    intakeCompanyName: values.companyName,
    sourceId,
    campaignId,
  })
  await db.update(salesLeads).set({
    capturedSourceId: sourceId,
    capturedCampaignId: campaignId,
    capturedTrackingLinkId,
    capturedAt,
    capturedSourceName: sourceName,
    capturedCampaignName: campaignName,
    capturedTrackingLinkLabel,
    sourceName,
    campaignName,
    possibleDuplicateLeadId: duplicate?.id ?? null,
    updatedAt: capturedAt,
  }).where(eq(salesLeads.id, lead.id))

  const history: string[] = []
  if (capturedTrackingLinkLabel) {
    history.push(`Submitted via tracking link “${capturedTrackingLinkLabel}”.`)
  } else {
    history.push('Submitted via untracked public intake (Website / Organic).')
  }
  if (blankToNull(values.message)) {
    history.push(values.message!.trim())
  }
  if (duplicate) {
    history.push(`Possible duplicate of Lead #${duplicate.id} (${duplicate.displayName}).`)
    await db.insert(salesNotes).values({
      recordKind: 'lead',
      recordId: duplicate.id,
      body: `Possible duplicate public inquiry created Lead #${lead.id} (${lead.displayName}).`,
      authorUserId: null,
      createdAt: now(),
    })
  }
  for (const body of history) {
    await db.insert(salesNotes).values({
      recordKind: 'lead',
      recordId: lead.id,
      body,
      authorUserId: null,
      createdAt: now(),
    })
  }

  try {
    await db.insert(salesPublicSubmissions).values({
      idempotencyKey,
      leadId: lead.id,
      createdAt: now(),
    })
  } catch {
    const raced = await loadSubmission(db, idempotencyKey)
    if (raced) {
      return {
        ok: true as const,
        replay: true,
        ignored: false,
        thankYouText: config.thankYouText,
      }
    }
    throw new DomainError('Could not save that inquiry.')
  }

  return {
    ok: true as const,
    replay: false,
    ignored: false,
    thankYouText: config.thankYouText,
  }
}

export async function publicTrackingPayload(db: Database, token: string) {
  const config = await readPublicIntakeConfig(db)
  const link = await recordTrackingClick(db, token)
  return {
    token: link.token,
    intake: publicIntakePresentation(config),
  }
}
