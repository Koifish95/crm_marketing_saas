import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { contentItemChannels, contentItems, contentPublications } from '../database/schema'
import type { ContentChannel, ContentStatus } from '../../shared/schemas/enums'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'
import { assertAssetsAllowPublication } from './assets'

const PUBLISH_READY: ContentStatus[] = ['READY_TO_PUBLISH', 'PUBLISHED']

function now() {
  return new Date(utcNowMs())
}

function assertCanAdvance(item: { approvalRequired: boolean, approvedAt: Date | null, status: string }, next: ContentStatus, canApprove: boolean) {
  if (item.approvalRequired && PUBLISH_READY.includes(next) && !item.approvedAt) {
    throw new DomainError('This content needs approval before it can be publish-ready.')
  }
  if (next === 'APPROVED' && !canApprove) {
    throw new DomainError('You cannot approve content.', 403)
  }
}

const withContent = {
  channels: true,
  publications: {
    with: {
      recordedBy: { columns: { id: true, displayName: true } },
    },
  },
  campaign: true,
  publisher: { columns: { id: true, displayName: true, role: true } },
  approvedBy: { columns: { id: true, displayName: true, role: true } },
} as const

export async function listContentItems(db: Database, filters?: { campaignId?: number }) {
  return db.query.contentItems.findMany({
    where: filters?.campaignId ? eq(contentItems.campaignId, filters.campaignId) : undefined,
    with: withContent,
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  })
}

export async function getContentItem(db: Database, id: number) {
  const row = await db.query.contentItems.findFirst({
    where: eq(contentItems.id, id),
    with: withContent,
  })
  if (!row) {
    throw new DomainError('Content item not found.', 404)
  }
  return row
}

async function replaceChannels(db: Database, contentItemId: number, channels: ContentChannel[]) {
  await db.delete(contentItemChannels).where(eq(contentItemChannels.contentItemId, contentItemId))
  const stamp = now()
  for (const channel of [...new Set(channels)]) {
    await db.insert(contentItemChannels).values({ contentItemId, channel, createdAt: stamp })
  }
}

export async function createContentItem(
  db: Database,
  input: {
    title: string
    body?: string | null
    status?: ContentStatus
    campaignId?: number | null
    publisherUserId?: number | null
    approvalRequired?: boolean
    plannedPublishAt?: Date | null
    notes?: string | null
    channels: ContentChannel[]
  },
  actor: SessionUser,
) {
  const stamp = now()
  const [row] = await db.insert(contentItems).values({
    title: input.title.trim(),
    body: input.body?.trim() || null,
    status: input.status ?? 'IDEA',
    campaignId: input.campaignId ?? null,
    publisherUserId: input.publisherUserId ?? null,
    approvalRequired: input.approvalRequired ?? false,
    plannedPublishAt: input.plannedPublishAt ?? null,
    notes: input.notes?.trim() || null,
    createdByUserId: actor.id,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  await replaceChannels(db, row!.id, input.channels)
  return getContentItem(db, row!.id)
}

export async function updateContentItem(
  db: Database,
  id: number,
  input: {
    title?: string
    body?: string | null
    status?: ContentStatus
    campaignId?: number | null
    publisherUserId?: number | null
    approvalRequired?: boolean
    plannedPublishAt?: Date | null
    notes?: string | null
    channels?: ContentChannel[]
  },
  actor: SessionUser,
  canApprove = actor.role === 'ADMIN',
) {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Content item not found.', 404)
  }
  if (input.status) {
    assertCanAdvance({
      approvalRequired: input.approvalRequired ?? row.approvalRequired,
      approvedAt: row.approvedAt,
      status: row.status,
    }, input.status, canApprove)
    if (PUBLISH_READY.includes(input.status)) {
      await assertAssetsAllowPublication(db, id)
    }
  }
  await db.update(contentItems).set({
    title: input.title?.trim() || row.title,
    body: input.body !== undefined ? (input.body?.trim() || null) : row.body,
    status: input.status ?? row.status,
    campaignId: input.campaignId !== undefined ? input.campaignId : row.campaignId,
    publisherUserId: input.publisherUserId !== undefined ? input.publisherUserId : row.publisherUserId,
    approvalRequired: input.approvalRequired ?? row.approvalRequired,
    plannedPublishAt: input.plannedPublishAt !== undefined ? input.plannedPublishAt : row.plannedPublishAt,
    notes: input.notes !== undefined ? (input.notes?.trim() || null) : row.notes,
    updatedAt: now(),
  }).where(eq(contentItems.id, id))
  if (input.channels) {
    await replaceChannels(db, id, input.channels)
  }
  return getContentItem(db, id)
}

export async function approveContentItem(db: Database, id: number, actor: SessionUser) {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Content item not found.', 404)
  }
  const stamp = now()
  await db.update(contentItems).set({
    status: 'APPROVED',
    approvedByUserId: actor.id,
    approvedAt: stamp,
    updatedAt: stamp,
  }).where(eq(contentItems.id, id))
  return getContentItem(db, id)
}

export async function recordContentPublication(
  db: Database,
  id: number,
  input: {
    channel: ContentChannel
    publishedAt?: Date
    publicUrl?: string | null
    externalPostId?: string | null
    notes?: string | null
  },
  actor: SessionUser,
  canApprove = actor.role === 'ADMIN',
) {
  const item = await getContentItem(db, id)
  assertCanAdvance(item, 'PUBLISHED', canApprove)
  await assertAssetsAllowPublication(db, id)
  const stamp = now()
  await db.insert(contentPublications).values({
    contentItemId: id,
    channel: input.channel,
    publishedAt: input.publishedAt ?? stamp,
    publicUrl: input.publicUrl?.trim() || null,
    externalPostId: input.externalPostId?.trim() || null,
    recordedByUserId: actor.id,
    notes: input.notes?.trim() || null,
    createdAt: stamp,
  })
  await db.update(contentItems).set({
    status: 'PUBLISHED',
    updatedAt: stamp,
  }).where(eq(contentItems.id, id))
  return getContentItem(db, id)
}
