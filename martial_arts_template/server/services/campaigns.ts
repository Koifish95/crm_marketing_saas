import { randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '../database'
import { campaignCollaborators, campaignPrograms, campaignTrackingLinks, campaigns, leads, programs, users } from '../database/schema'
import type { CampaignStatus } from '../../shared/schemas/enums'
import { friendlyTrackingPath, trackingPath } from '../../shared/utils/campaign'
import { utcNowMs } from '../../shared/utils/time'
import { DomainError } from './errors'

export { friendlyTrackingPath, trackingPath }

const EVENT_DESTINATION = /^\/events\/[a-z0-9]+(?:-[a-z0-9]+)*$/

const CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']

function now() {
  return new Date(utcNowMs())
}

function slugify(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!slug) {
    throw new DomainError('Campaign slug is required.')
  }
  return slug.slice(0, 80)
}

function trackingCode() {
  return randomBytes(6).toString('hex')
}

function parseChosenPublicSlug(raw: string | undefined) {
  if (raw == null) {
    return undefined
  }
  const normalized = raw.trim().toLowerCase()
  if (!normalized) {
    return undefined
  }
  return slugify(normalized)
}

async function assertPublicSlugAvailable(db: Database, slug: string, exceptLinkId?: number) {
  const [existing] = await db.select({ id: campaignTrackingLinks.id }).from(campaignTrackingLinks)
    .where(eq(campaignTrackingLinks.publicSlug, slug))
    .limit(1)
  if (existing && existing.id !== exceptLinkId) {
    throw new DomainError('That tracking link slug is already in use.', 409)
  }
}

async function uniquePublicSlug(db: Database, base: string, exceptLinkId?: number) {
  const root = slugify(base)
  let candidate = root
  let n = 1
  while (true) {
    const [existing] = await db.select({ id: campaignTrackingLinks.id }).from(campaignTrackingLinks)
      .where(eq(campaignTrackingLinks.publicSlug, candidate))
      .limit(1)
    if (!existing || existing.id === exceptLinkId) {
      return candidate
    }
    n += 1
    const suffix = `-${n}`
    candidate = `${root.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`
  }
}

export function assertTrackingDestination(path: string) {
  const dest = path.trim()
  if (dest.includes('://') || dest.startsWith('//') || dest.includes('\\')) {
    throw new DomainError('Tracking destination must be /trial or an event page.')
  }
  if (dest === '/trial' || EVENT_DESTINATION.test(dest)) {
    return dest
  }
  throw new DomainError('Tracking destination must be /trial or an event page.')
}

function activeFromStatus(status: CampaignStatus) {
  return status === 'ACTIVE'
}

function resolveStatus(input: { status?: CampaignStatus, active?: boolean }, fallback: CampaignStatus = 'ACTIVE'): CampaignStatus {
  if (input.status) {
    if (!CAMPAIGN_STATUSES.includes(input.status)) {
      throw new DomainError('Invalid campaign status.')
    }
    return input.status
  }
  if (input.active === false) {
    return 'COMPLETED'
  }
  if (input.active === true) {
    return 'ACTIVE'
  }
  return fallback
}

async function replaceCollaborators(db: Database, campaignId: number, userIds: number[] | undefined) {
  if (userIds == null) {
    return
  }
  const unique = [...new Set(userIds)]
  for (const userId of unique) {
    const [person] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
    if (!person) {
      throw new DomainError('Collaborator not found.')
    }
  }
  await db.delete(campaignCollaborators).where(eq(campaignCollaborators.campaignId, campaignId))
  const stamp = now()
  for (const userId of unique) {
    await db.insert(campaignCollaborators).values({ campaignId, userId, createdAt: stamp })
  }
}

async function replacePrograms(db: Database, campaignId: number, programIds: number[] | undefined) {
  if (programIds == null) {
    return
  }
  const unique = [...new Set(programIds)]
  for (const programId of unique) {
    const [row] = await db.select({ id: programs.id }).from(programs).where(eq(programs.id, programId)).limit(1)
    if (!row) {
      throw new DomainError('Program not found.')
    }
  }
  await db.delete(campaignPrograms).where(eq(campaignPrograms.campaignId, campaignId))
  const stamp = now()
  for (const programId of unique) {
    await db.insert(campaignPrograms).values({ campaignId, programId, createdAt: stamp })
  }
}

const campaignWith = {
  trackingLinks: true,
  owner: {
    columns: {
      id: true,
      displayName: true,
      email: true,
      role: true,
    },
  },
  collaborators: {
    with: {
      user: {
        columns: {
          id: true,
          displayName: true,
          email: true,
          role: true,
        },
      },
    },
  },
  programs: { with: { program: true } },
  leads: {
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
    },
    with: {
      lines: {
        columns: {
          id: true,
          status: true,
        },
      },
    },
  },
} as const

export async function listCampaignSummaries(db: Database) {
  const rows = await db.query.campaigns.findMany({
    with: {
      owner: {
        columns: {
          id: true,
          displayName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.name)],
  })
  const counts = await db
    .select({
      campaignId: leads.campaignId,
      householdCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(leads)
    .groupBy(leads.campaignId)
  const byId = new Map<number, number>()
  for (const row of counts) {
    if (row.campaignId != null) {
      byId.set(row.campaignId, row.householdCount)
    }
  }
  return rows.map(row => ({
    ...row,
    householdCount: byId.get(row.id) ?? 0,
  }))
}

export async function listManagedCampaigns(db: Database) {
  return listCampaignSummaries(db)
}

export async function createCampaign(
  db: Database,
  input: {
    name: string
    slug?: string
    kind?: 'ORGANIC' | 'PAID'
    budgetCents?: number | null
    channel?: string | null
    active?: boolean
    status?: CampaignStatus
    description?: string | null
    objective?: string | null
    offer?: string | null
    targetAudience?: string | null
    notes?: string | null
    ownerUserId?: number | null
    collaboratorUserIds?: number[]
    programIds?: number[]
    startsAt?: Date | null
    endsAt?: Date | null
    actualStartsAt?: Date | null
    actualEndsAt?: Date | null
  },
) {
  const stamp = now()
  const slug = slugify(input.slug || input.name)
  const [existing] = await db.select().from(campaigns).where(eq(campaigns.slug, slug))
  if (existing) {
    throw new DomainError('A campaign with that slug already exists.')
  }
  const kind = input.kind ?? 'ORGANIC'
  if (kind !== 'ORGANIC' && kind !== 'PAID') {
    throw new DomainError('Campaign kind must be organic or paid.')
  }
  if (input.budgetCents != null && (!Number.isInteger(input.budgetCents) || input.budgetCents < 0)) {
    throw new DomainError('Campaign budget must be integer cents.')
  }
  const status = resolveStatus(input)

  const [campaign] = await db.insert(campaigns).values({
    name: input.name.trim(),
    slug,
    kind,
    budgetCents: input.budgetCents ?? null,
    channel: input.channel?.trim() || null,
    status,
    active: activeFromStatus(status),
    description: input.description?.trim() || null,
    objective: input.objective?.trim() || null,
    offer: input.offer?.trim() || null,
    targetAudience: input.targetAudience?.trim() || null,
    notes: input.notes?.trim() || null,
    ownerUserId: input.ownerUserId ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    actualStartsAt: input.actualStartsAt ?? null,
    actualEndsAt: input.actualEndsAt ?? null,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()

  await db.insert(campaignTrackingLinks).values({
    campaignId: campaign!.id,
    code: trackingCode(),
    publicSlug: await uniquePublicSlug(db, slug),
    label: 'Default',
    isDefault: true,
    utmSource: 'campaign',
    utmMedium: 'link',
    utmCampaign: slug,
    destinationPath: '/trial',
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  })
  await replaceCollaborators(db, campaign!.id, input.collaboratorUserIds)
  await replacePrograms(db, campaign!.id, input.programIds)

  return getCampaign(db, campaign!.id)
}

export async function updateCampaign(
  db: Database,
  id: number,
  input: {
    name?: string
    kind?: 'ORGANIC' | 'PAID'
    budgetCents?: number | null
    channel?: string | null
    active?: boolean
    status?: CampaignStatus
    description?: string | null
    objective?: string | null
    offer?: string | null
    targetAudience?: string | null
    notes?: string | null
    ownerUserId?: number | null
    collaboratorUserIds?: number[]
    programIds?: number[]
    startsAt?: Date | null
    endsAt?: Date | null
    actualStartsAt?: Date | null
    actualEndsAt?: Date | null
  },
) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id))
  if (!campaign) {
    throw new DomainError('Campaign not found.', 404)
  }
  const status = resolveStatus(input, campaign.status as CampaignStatus)
  await db.update(campaigns).set({
    name: input.name?.trim() || campaign.name,
    kind: input.kind ?? campaign.kind,
    budgetCents: input.budgetCents !== undefined ? input.budgetCents : campaign.budgetCents,
    channel: input.channel !== undefined ? (input.channel?.trim() || null) : campaign.channel,
    status,
    active: activeFromStatus(status),
    description: input.description !== undefined ? (input.description?.trim() || null) : campaign.description,
    objective: input.objective !== undefined ? (input.objective?.trim() || null) : campaign.objective,
    offer: input.offer !== undefined ? (input.offer?.trim() || null) : campaign.offer,
    targetAudience: input.targetAudience !== undefined ? (input.targetAudience?.trim() || null) : campaign.targetAudience,
    notes: input.notes !== undefined ? (input.notes?.trim() || null) : campaign.notes,
    ownerUserId: input.ownerUserId !== undefined ? input.ownerUserId : campaign.ownerUserId,
    startsAt: input.startsAt !== undefined ? input.startsAt : campaign.startsAt,
    endsAt: input.endsAt !== undefined ? input.endsAt : campaign.endsAt,
    actualStartsAt: input.actualStartsAt !== undefined ? input.actualStartsAt : campaign.actualStartsAt,
    actualEndsAt: input.actualEndsAt !== undefined ? input.actualEndsAt : campaign.actualEndsAt,
    updatedAt: now(),
  }).where(eq(campaigns.id, id))
  await replaceCollaborators(db, id, input.collaboratorUserIds)
  await replacePrograms(db, id, input.programIds)
  return getCampaign(db, id)
}

export async function addCampaignTrackingLink(
  db: Database,
  campaignId: number,
  input: {
    label: string
    publicSlug?: string
    destinationPath?: string | null
    utmSource?: string | null
    utmMedium?: string | null
    utmContent?: string | null
    utmTerm?: string | null
  },
) {
  const campaign = await getCampaign(db, campaignId)
  const stamp = now()
  const destinationPath = assertTrackingDestination(input.destinationPath?.trim() || '/trial')
  const label = input.label.trim() || 'Link'
  const chosen = parseChosenPublicSlug(input.publicSlug)
  if (chosen) {
    await assertPublicSlugAvailable(db, chosen)
  }
  const publicSlug = chosen ?? await uniquePublicSlug(db, `${campaign.slug}-${label}`)
  await db.insert(campaignTrackingLinks).values({
    campaignId,
    code: trackingCode(),
    publicSlug,
    label,
    isDefault: false,
    utmSource: input.utmSource?.trim() || 'campaign',
    utmMedium: input.utmMedium?.trim() || 'link',
    utmCampaign: campaign.slug,
    utmContent: input.utmContent?.trim() || null,
    utmTerm: input.utmTerm?.trim() || null,
    destinationPath,
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  })
  return getCampaign(db, campaignId)
}

export async function updateCampaignTrackingLink(
  db: Database,
  campaignId: number,
  linkId: number,
  input: { label?: string, publicSlug?: string },
) {
  const [link] = await db.select().from(campaignTrackingLinks)
    .where(and(eq(campaignTrackingLinks.id, linkId), eq(campaignTrackingLinks.campaignId, campaignId)))
    .limit(1)
  if (!link) {
    throw new DomainError('Tracking link not found.', 404)
  }
  const nextLabel = input.label != null ? input.label.trim() : link.label
  if (!nextLabel) {
    throw new DomainError('Label is required.')
  }
  const chosen = parseChosenPublicSlug(input.publicSlug)
  const nextSlug = chosen ?? link.publicSlug
  if (chosen) {
    await assertPublicSlugAvailable(db, chosen, linkId)
  }
  await db.update(campaignTrackingLinks).set({
    label: nextLabel,
    publicSlug: nextSlug,
    updatedAt: now(),
  }).where(eq(campaignTrackingLinks.id, linkId))
  return getCampaign(db, campaignId)
}

export async function resolvePublicTrackingSlug(db: Database, rawSlug: string) {
  const slug = rawSlug.trim().toLowerCase()
  if (!slug) {
    throw new DomainError('Tracking link not found.', 404)
  }
  const [link] = await db.select().from(campaignTrackingLinks)
    .where(eq(campaignTrackingLinks.publicSlug, slug))
    .limit(1)
  if (!link?.active) {
    throw new DomainError('Tracking link not found.', 404)
  }
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, link.campaignId)).limit(1)
  if (!campaign || campaign.status === 'CANCELLED') {
    throw new DomainError('Tracking link not found.', 404)
  }
  return {
    destinationPath: link.destinationPath || '/trial',
    trackingCode: link.code,
    campaign: campaign.slug,
    utmSource: link.utmSource,
    utmMedium: link.utmMedium,
    utmContent: link.utmContent,
    utmTerm: link.utmTerm,
  }
}

export async function getCampaign(db: Database, id: number) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
    with: campaignWith,
  })
  if (!campaign) {
    throw new DomainError('Campaign not found.', 404)
  }
  return campaign
}

export async function resolveCampaignAttribution(
  db: Database,
  input: {
    campaign?: string
    trackingCode?: string
    utmSource?: string
    utmMedium?: string
    utmContent?: string
    utmTerm?: string
  },
) {
  let campaignId: number | undefined
  let campaignTrackingLinkId: number | undefined
  let utmSource = input.utmSource?.trim() || null
  let utmMedium = input.utmMedium?.trim() || null
  let utmContent = input.utmContent?.trim() || null
  let utmTerm = input.utmTerm?.trim() || null

  if (input.trackingCode?.trim()) {
    const [link] = await db.select().from(campaignTrackingLinks).where(eq(campaignTrackingLinks.code, input.trackingCode.trim()))
    if (link?.active) {
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, link.campaignId))
      if (campaign && campaign.status !== 'CANCELLED') {
        campaignId = campaign.id
        campaignTrackingLinkId = link.id
        utmSource = utmSource || link.utmSource
        utmMedium = utmMedium || link.utmMedium
        utmContent = utmContent || link.utmContent
        utmTerm = utmTerm || link.utmTerm
      }
    }
  }

  if (!campaignId && input.campaign?.trim()) {
    const slug = input.campaign.trim().toLowerCase()
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.slug, slug))
    if (campaign && campaign.status !== 'CANCELLED') {
      campaignId = campaign.id
      const links = await db.select().from(campaignTrackingLinks).where(eq(campaignTrackingLinks.campaignId, campaign.id))
      const fallback = links.find(link => link.isDefault && link.active) ?? links.find(link => link.active)
      if (fallback) {
        campaignTrackingLinkId = fallback.id
        utmSource = utmSource || fallback.utmSource
        utmMedium = utmMedium || fallback.utmMedium
      }
    }
  }

  return { campaignId, campaignTrackingLinkId, utmSource, utmMedium, utmContent, utmTerm }
}
