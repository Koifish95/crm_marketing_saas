import { randomBytes } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import {
  salesCampaigns,
  salesSources,
  salesTrackingLinks,
} from '../database/schema'
import {
  SEEDED_SOURCES,
  WEBSITE_ORGANIC_CODE,
  isCampaignStatus,
  sourceRequiresDetail,
  type CampaignStatus,
} from '../../shared/utils/catalog'
import { utcNowMs } from '../../shared/utils/time'

function now() {
  return new Date(utcNowMs())
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function slugCode(name: string) {
  const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return code || 'source'
}

export async function ensureSeededSources(db: Database) {
  const stamp = now()
  for (const source of SEEDED_SOURCES) {
    const [existing] = await db.select().from(salesSources).where(eq(salesSources.code, source.code)).limit(1)
    if (existing) {
      continue
    }
    await db.insert(salesSources).values({
      code: source.code,
      name: source.name,
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    })
  }
}

export async function listSources(db: Database, filters: { active?: boolean } = {}) {
  await ensureSeededSources(db)
  const rows = await db.select().from(salesSources).orderBy(salesSources.name)
  return rows.filter(row => filters.active == null || row.active === filters.active)
}

export async function getSource(db: Database, id: number) {
  const [row] = await db.select().from(salesSources).where(eq(salesSources.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Source not found.', 404)
  }
  return row
}

export async function getSourceByCode(db: Database, code: string) {
  await ensureSeededSources(db)
  const [row] = await db.select().from(salesSources).where(eq(salesSources.code, code)).limit(1)
  if (!row) {
    throw new DomainError('Source not found.', 404)
  }
  return row
}

export async function websiteOrganicSource(db: Database) {
  return getSourceByCode(db, WEBSITE_ORGANIC_CODE)
}

export async function createSource(db: Database, input: { name: string, code?: string }) {
  const name = input.name.trim()
  if (!name) {
    throw new DomainError('Source name is required.')
  }
  let code = (input.code?.trim() || slugCode(name)).toLowerCase()
  const [clash] = await db.select().from(salesSources).where(eq(salesSources.code, code)).limit(1)
  if (clash) {
    code = `${code}_${utcNowMs().toString(36)}`
  }
  const createdAt = now()
  await db.insert(salesSources).values({
    code,
    name,
    active: true,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesSources)
    .where(and(eq(salesSources.code, code), eq(salesSources.createdAt, createdAt)))
    .limit(1)
  return created!
}

export async function updateSource(db: Database, id: number, input: { name?: string, active?: boolean }) {
  const current = await getSource(db, id)
  const patch: Partial<typeof salesSources.$inferInsert> = { updatedAt: now() }
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      throw new DomainError('Source name is required.')
    }
    patch.name = name
  }
  if (input.active !== undefined) {
    patch.active = input.active
  }
  await db.update(salesSources).set(patch).where(eq(salesSources.id, id))
  return getSource(db, current.id)
}

export async function requireActiveSource(db: Database, sourceId: number) {
  const source = await getSource(db, sourceId)
  if (!source.active) {
    throw new DomainError('That Source is inactive.')
  }
  return source
}

export function assertSourceDetail(code: string, detail: string | null | undefined) {
  if (sourceRequiresDetail(code) && !blankToNull(detail)) {
    throw new DomainError('Other requires source detail.')
  }
}

export async function listCampaigns(db: Database, filters: { search?: string, status?: string } = {}) {
  const rows = await db.select().from(salesCampaigns).orderBy(desc(salesCampaigns.updatedAt))
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!row.name.toLowerCase().includes(q) && !(row.description ?? '').toLowerCase().includes(q)) {
        return false
      }
    }
    return true
  })
}

export async function getCampaign(db: Database, id: number) {
  const [row] = await db.select().from(salesCampaigns).where(eq(salesCampaigns.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Campaign not found.', 404)
  }
  return row
}

export async function createCampaign(db: Database, input: {
  name: string
  description?: string
  status?: CampaignStatus
  startsAt?: number | null
  endsAt?: number | null
  budgetCents?: number | null
}) {
  const name = input.name.trim()
  if (!name) {
    throw new DomainError('Campaign name is required.')
  }
  const status = input.status ?? 'draft'
  if (!isCampaignStatus(status)) {
    throw new DomainError('Unknown campaign status.')
  }
  const createdAt = now()
  await db.insert(salesCampaigns).values({
    name,
    description: blankToNull(input.description),
    status,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    budgetCents: input.budgetCents ?? null,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesCampaigns)
    .where(and(eq(salesCampaigns.name, name), eq(salesCampaigns.createdAt, createdAt)))
    .orderBy(desc(salesCampaigns.id))
    .limit(1)
  return created!
}

export async function updateCampaign(db: Database, id: number, input: {
  name?: string
  description?: string | null
  status?: CampaignStatus
  startsAt?: number | null
  endsAt?: number | null
  budgetCents?: number | null
}) {
  await getCampaign(db, id)
  const patch: Partial<typeof salesCampaigns.$inferInsert> = { updatedAt: now() }
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      throw new DomainError('Campaign name is required.')
    }
    patch.name = name
  }
  if (input.description !== undefined) {
    patch.description = blankToNull(input.description)
  }
  if (input.status !== undefined) {
    if (!isCampaignStatus(input.status)) {
      throw new DomainError('Unknown campaign status.')
    }
    patch.status = input.status
  }
  if (input.startsAt !== undefined) {
    patch.startsAt = input.startsAt == null ? null : new Date(input.startsAt)
  }
  if (input.endsAt !== undefined) {
    patch.endsAt = input.endsAt == null ? null : new Date(input.endsAt)
  }
  if (input.budgetCents !== undefined) {
    patch.budgetCents = input.budgetCents
  }
  await db.update(salesCampaigns).set(patch).where(eq(salesCampaigns.id, id))
  return getCampaign(db, id)
}

export function mintTrackingToken() {
  return randomBytes(18).toString('base64url')
}

export async function listTrackingLinks(db: Database, filters: {
  campaignId?: number
  sourceId?: number
  active?: boolean
} = {}) {
  const rows = await db.select().from(salesTrackingLinks).orderBy(desc(salesTrackingLinks.createdAt))
  return rows.filter((row) => {
    if (filters.campaignId != null && row.campaignId !== filters.campaignId) {
      return false
    }
    if (filters.sourceId != null && row.sourceId !== filters.sourceId) {
      return false
    }
    if (filters.active != null && row.active !== filters.active) {
      return false
    }
    return true
  })
}

export async function getTrackingLink(db: Database, id: number) {
  const [row] = await db.select().from(salesTrackingLinks).where(eq(salesTrackingLinks.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Tracking link not found.', 404)
  }
  return row
}

export async function createTrackingLink(db: Database, input: {
  campaignId: number
  sourceId: number
  label: string
  active?: boolean
}) {
  await getCampaign(db, input.campaignId)
  await requireActiveSource(db, input.sourceId)
  const label = input.label.trim()
  if (!label) {
    throw new DomainError('Tracking link label is required.')
  }
  const createdAt = now()
  let token = mintTrackingToken()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [clash] = await db.select().from(salesTrackingLinks).where(eq(salesTrackingLinks.token, token)).limit(1)
    if (!clash) {
      break
    }
    token = mintTrackingToken()
  }
  await db.insert(salesTrackingLinks).values({
    campaignId: input.campaignId,
    sourceId: input.sourceId,
    label,
    token,
    active: input.active ?? true,
    clickCount: 0,
    createdAt,
    updatedAt: createdAt,
  })
  const [created] = await db.select().from(salesTrackingLinks)
    .where(eq(salesTrackingLinks.token, token))
    .limit(1)
  return created!
}

export async function updateTrackingLink(db: Database, id: number, input: {
  label?: string
  active?: boolean
  sourceId?: number
}) {
  const current = await getTrackingLink(db, id)
  const patch: Partial<typeof salesTrackingLinks.$inferInsert> = { updatedAt: now() }
  if (input.label !== undefined) {
    const label = input.label.trim()
    if (!label) {
      throw new DomainError('Tracking link label is required.')
    }
    patch.label = label
  }
  if (input.active !== undefined) {
    patch.active = input.active
  }
  if (input.sourceId !== undefined) {
    await requireActiveSource(db, input.sourceId)
    patch.sourceId = input.sourceId
  }
  await db.update(salesTrackingLinks).set(patch).where(eq(salesTrackingLinks.id, current.id))
  return getTrackingLink(db, current.id)
}

export async function resolveActiveTrackingLink(db: Database, token: string) {
  const normalized = token.trim()
  if (!normalized) {
    throw new DomainError('That link is not available.', 404)
  }
  const [row] = await db.select().from(salesTrackingLinks).where(eq(salesTrackingLinks.token, normalized)).limit(1)
  if (!row || !row.active) {
    throw new DomainError('That link is not available.', 404)
  }
  return row
}

export async function recordTrackingClick(db: Database, token: string) {
  const link = await resolveActiveTrackingLink(db, token)
  await db.update(salesTrackingLinks)
    .set({
      clickCount: sql`${salesTrackingLinks.clickCount} + 1`,
      updatedAt: now(),
    })
    .where(eq(salesTrackingLinks.id, link.id))
  return getTrackingLink(db, link.id)
}

export type AttributionSnapshot = {
  sourceId: number | null
  campaignId: number | null
  sourceDetail: string | null
  sourceName: string | null
  campaignName: string | null
  capturedSourceId: number | null
  capturedCampaignId: number | null
  capturedTrackingLinkId: number | null
  capturedAt: Date | null
  capturedSourceName: string | null
  capturedCampaignName: string | null
  capturedTrackingLinkLabel: string | null
}

export async function resolveAttributionInput(db: Database, input: {
  sourceId?: number | null
  campaignId?: number | null
  sourceDetail?: string | null
}) {
  let source = null
  if (input.sourceId != null) {
    source = await getSource(db, input.sourceId)
    assertSourceDetail(source.code, input.sourceDetail)
  }
  let campaign = null
  if (input.campaignId != null) {
    campaign = await getCampaign(db, input.campaignId)
  }
  return {
    sourceId: source?.id ?? null,
    campaignId: campaign?.id ?? null,
    sourceDetail: source && sourceRequiresDetail(source.code) ? blankToNull(input.sourceDetail) : blankToNull(input.sourceDetail),
    sourceName: source?.name ?? null,
    campaignName: campaign?.name ?? null,
    source,
    campaign,
  }
}

export function formatAttributionChange(
  from: { sourceName: string | null, campaignName: string | null, sourceDetail: string | null },
  to: { sourceName: string | null, campaignName: string | null, sourceDetail: string | null },
) {
  const describe = (row: typeof from) => [
    row.sourceName || 'No source',
    row.campaignName || 'No campaign',
    row.sourceDetail ? `detail “${row.sourceDetail}”` : null,
  ].filter(Boolean).join(' · ')
  return `Attribution corrected: ${describe(from)} → ${describe(to)}.`
}
