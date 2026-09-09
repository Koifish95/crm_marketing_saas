import { desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import { assets, campaigns, contentItems, marketingTasks, acquisitionEvents, users } from '../database/schema'
import type { MarketingTaskStatus, MarketingTaskType } from '../../shared/schemas/enums'
import { followUpDueState, type FollowUpTimeView } from '../../shared/utils/follow-up'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'

function now() {
  return new Date(utcNowMs())
}

const userColumns = {
  id: true,
  displayName: true,
  email: true,
  role: true,
} as const

const taskWith = {
  campaign: true,
  contentItem: {
    columns: { id: true, title: true, status: true, plannedPublishAt: true },
    with: { campaign: { columns: { id: true, name: true } } },
  },
  asset: {
    columns: {
      id: true,
      displayName: true,
      mediaType: true,
      marketingUseStatus: true,
      archived: true,
    },
    with: { campaign: { columns: { id: true, name: true } } },
  },
  event: { columns: { id: true, title: true } },
  assignee: { columns: userColumns },
  createdBy: { columns: userColumns },
} as const

export async function listMarketingTasks(
  db: Database,
  view?: FollowUpTimeView | 'all',
  nowMs = utcNowMs(),
  filters?: { campaignId?: number },
) {
  const rows = await db.query.marketingTasks.findMany({
    where: filters?.campaignId ? eq(marketingTasks.campaignId, filters.campaignId) : undefined,
    with: taskWith,
    orderBy: [desc(marketingTasks.dueAt)],
  })
  return rows
    .map(row => ({
      ...row,
      dueState: row.status === 'PENDING' ? followUpDueState(new Date(row.dueAt).getTime(), nowMs) : null,
    }))
    .filter((row) => {
      if (!view || view === 'all') {
        return true
      }
      if (row.status !== 'PENDING' || !row.dueState) {
        return false
      }
      if (view === 'overdue') {
        return row.dueState === 'OVERDUE'
      }
      if (view === 'due_today') {
        return row.dueState === 'DUE_TODAY'
      }
      return row.dueState === 'UPCOMING'
    })
}

export async function createMarketingTask(
  db: Database,
  input: {
    title: string
    type?: MarketingTaskType
    description?: string | null
    dueAt: Date
    assigneeUserId?: number | null
    campaignId?: number | null
    contentItemId?: number | null
    assetId?: number | null
    eventId?: number | null
    notes?: string | null
  },
  actor: SessionUser,
) {
  if (input.campaignId != null) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1)
    if (!campaign) {
      throw new DomainError('Campaign not found.', 404)
    }
  }
  if (input.assigneeUserId != null) {
    const [person] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.assigneeUserId)).limit(1)
    if (!person) {
      throw new DomainError('Assignee not found.', 404)
    }
  }
  if (input.contentItemId != null) {
    const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(eq(contentItems.id, input.contentItemId)).limit(1)
    if (!item) {
      throw new DomainError('Content item not found.', 404)
    }
  }
  if (input.assetId != null) {
    const [asset] = await db.select({ id: assets.id }).from(assets).where(eq(assets.id, input.assetId)).limit(1)
    if (!asset) {
      throw new DomainError('Asset not found.', 404)
    }
  }
  if (input.eventId != null) {
    const [event] = await db.select({ id: acquisitionEvents.id }).from(acquisitionEvents).where(eq(acquisitionEvents.id, input.eventId)).limit(1)
    if (!event) {
      throw new DomainError('Event not found.', 404)
    }
  }
  const stamp = now()
  const [row] = await db.insert(marketingTasks).values({
    title: input.title.trim(),
    type: input.type ?? 'OTHER',
    description: input.description?.trim() || null,
    status: 'PENDING',
    dueAt: input.dueAt,
    assigneeUserId: input.assigneeUserId ?? null,
    createdByUserId: actor.id,
    campaignId: input.campaignId ?? null,
    contentItemId: input.contentItemId ?? null,
    assetId: input.assetId ?? null,
    eventId: input.eventId ?? null,
    notes: input.notes?.trim() || null,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return getMarketingTask(db, row!.id)
}

export async function updateMarketingTask(
  db: Database,
  id: number,
  input: {
    title?: string
    type?: MarketingTaskType
    description?: string | null
    dueAt?: Date
    status?: MarketingTaskStatus
    assigneeUserId?: number | null
    campaignId?: number | null
    contentItemId?: number | null
    assetId?: number | null
    eventId?: number | null
    notes?: string | null
  },
  actor: SessionUser,
) {
  const [row] = await db.select().from(marketingTasks).where(eq(marketingTasks.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Marketing task not found.', 404)
  }
  if (input.campaignId != null) {
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1)
    if (!campaign) {
      throw new DomainError('Campaign not found.', 404)
    }
  }
  if (input.assigneeUserId != null) {
    const [person] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.assigneeUserId)).limit(1)
    if (!person) {
      throw new DomainError('Assignee not found.', 404)
    }
  }
  if (input.contentItemId != null) {
    const [item] = await db.select({ id: contentItems.id }).from(contentItems).where(eq(contentItems.id, input.contentItemId)).limit(1)
    if (!item) {
      throw new DomainError('Content item not found.', 404)
    }
  }
  if (input.assetId != null) {
    const [asset] = await db.select({ id: assets.id }).from(assets).where(eq(assets.id, input.assetId)).limit(1)
    if (!asset) {
      throw new DomainError('Asset not found.', 404)
    }
  }
  if (input.eventId != null) {
    const [event] = await db.select({ id: acquisitionEvents.id }).from(acquisitionEvents).where(eq(acquisitionEvents.id, input.eventId)).limit(1)
    if (!event) {
      throw new DomainError('Event not found.', 404)
    }
  }
  const stamp = now()
  let completedAt = row.completedAt
  let completedByUserId = row.completedByUserId
  if (input.status === 'COMPLETED' && row.status !== 'COMPLETED') {
    completedAt = stamp
    completedByUserId = actor.id
  }
  if (input.status && input.status !== 'COMPLETED') {
    completedAt = null
    completedByUserId = null
  }
  await db.update(marketingTasks).set({
    title: input.title?.trim() || row.title,
    type: input.type ?? row.type,
    description: input.description !== undefined ? (input.description?.trim() || null) : row.description,
    dueAt: input.dueAt ?? row.dueAt,
    status: input.status ?? row.status,
    assigneeUserId: input.assigneeUserId !== undefined ? input.assigneeUserId : row.assigneeUserId,
    campaignId: input.campaignId !== undefined ? input.campaignId : row.campaignId,
    contentItemId: input.contentItemId !== undefined ? input.contentItemId : row.contentItemId,
    assetId: input.assetId !== undefined ? input.assetId : row.assetId,
    eventId: input.eventId !== undefined ? input.eventId : row.eventId,
    notes: input.notes !== undefined ? (input.notes?.trim() || null) : row.notes,
    completedAt,
    completedByUserId,
    updatedAt: stamp,
  }).where(eq(marketingTasks.id, id))
  return getMarketingTask(db, id)
}

export async function getMarketingTask(db: Database, id: number) {
  const row = await db.query.marketingTasks.findFirst({
    where: eq(marketingTasks.id, id),
    with: taskWith,
  })
  if (!row) {
    throw new DomainError('Marketing task not found.', 404)
  }
  return {
    ...row,
    dueState: row.status === 'PENDING' ? followUpDueState(new Date(row.dueAt).getTime(), utcNowMs()) : null,
  }
}
