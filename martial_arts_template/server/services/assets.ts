import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, or } from 'drizzle-orm'
import type { Database } from '../database'
import { assetUsages, assets } from '../database/schema'
import type { AssetMarketingUse } from '../../shared/schemas/enums'
import { utcNowMs } from '../../shared/utils/time'
import type { SessionUser } from './authorization'
import { DomainError } from './errors'

export function uploadsDirectory() {
  return process.env.ASSET_UPLOAD_DIR || join(process.cwd(), 'data', 'uploads')
}

function now() {
  return new Date(utcNowMs())
}

const assetDetailWith = {
  uploadedBy: { columns: { id: true, displayName: true } },
  campaign: { columns: { id: true, name: true } },
  contentItem: { columns: { id: true, title: true } },
  usages: {
    with: {
      campaign: { columns: { id: true, name: true } },
      contentItem: { columns: { id: true, title: true } },
    },
  },
} as const

export async function listAssets(db: Database, filters?: { campaignId?: number }) {
  let where = undefined as ReturnType<typeof eq> | ReturnType<typeof or> | undefined
  if (filters?.campaignId) {
    const usageRows = await db.select({ assetId: assetUsages.assetId }).from(assetUsages).where(eq(assetUsages.campaignId, filters.campaignId))
    const usageIds = [...new Set(usageRows.map(row => row.assetId))]
    where = usageIds.length
      ? or(eq(assets.campaignId, filters.campaignId), inArray(assets.id, usageIds))
      : eq(assets.campaignId, filters.campaignId)
  }
  return db.query.assets.findMany({
    where,
    with: assetDetailWith,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })
}

export async function getAsset(db: Database, id: number) {
  const row = await db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: assetDetailWith,
  })
  if (!row) {
    throw new DomainError('Asset not found.', 404)
  }
  return row
}

export async function createAsset(
  db: Database,
  input: {
    displayName: string
    originalFilename: string
    mediaType: string
    bytes: Buffer
    description?: string | null
    campaignId?: number | null
    contentItemId?: number | null
  },
  actor: SessionUser,
) {
  if (!input.bytes.length) {
    throw new DomainError('Upload a file.')
  }
  const dir = uploadsDirectory()
  mkdirSync(dir, { recursive: true })
  const storedName = `${randomUUID()}`
  writeFileSync(join(dir, storedName), input.bytes)
  const stamp = now()
  const [row] = await db.insert(assets).values({
    displayName: input.displayName.trim() || input.originalFilename,
    originalFilename: input.originalFilename,
    mediaType: input.mediaType || 'application/octet-stream',
    storagePath: storedName,
    description: input.description?.trim() || null,
    marketingUseStatus: 'UNKNOWN',
    uploadedByUserId: actor.id,
    campaignId: input.campaignId ?? null,
    contentItemId: input.contentItemId ?? null,
    createdAt: stamp,
    updatedAt: stamp,
  }).returning()
  return getAsset(db, row!.id)
}

export async function updateAsset(
  db: Database,
  id: number,
  input: {
    displayName?: string
    description?: string | null
    marketingUseStatus?: AssetMarketingUse
    restrictionNote?: string | null
    campaignId?: number | null
    contentItemId?: number | null
    archived?: boolean
  },
) {
  const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Asset not found.', 404)
  }
  if (
    (input.marketingUseStatus === 'RESTRICTED' || input.marketingUseStatus === 'DO_NOT_USE')
    && !(input.restrictionNote ?? row.restrictionNote)?.trim()
  ) {
    throw new DomainError('Restricted assets need a restriction note.')
  }
  await db.update(assets).set({
    displayName: input.displayName?.trim() || row.displayName,
    description: input.description !== undefined ? (input.description?.trim() || null) : row.description,
    marketingUseStatus: input.marketingUseStatus ?? row.marketingUseStatus,
    restrictionNote: input.restrictionNote !== undefined ? (input.restrictionNote?.trim() || null) : row.restrictionNote,
    campaignId: input.campaignId !== undefined ? input.campaignId : row.campaignId,
    contentItemId: input.contentItemId !== undefined ? input.contentItemId : row.contentItemId,
    archived: input.archived ?? row.archived,
    updatedAt: now(),
  }).where(eq(assets.id, id))
  return getAsset(db, id)
}

export async function attachAssetToContent(db: Database, assetId: number, contentItemId: number) {
  const asset = await getAsset(db, assetId)
  if (asset.archived) {
    throw new DomainError('Archived assets cannot be attached.')
  }
  const [existing] = await db.select().from(assetUsages).where(and(
    eq(assetUsages.assetId, assetId),
    eq(assetUsages.contentItemId, contentItemId),
  )).limit(1)
  if (!existing) {
    await db.insert(assetUsages).values({
      assetId,
      contentItemId,
      campaignId: asset.campaignId,
      usageKind: 'ATTACHED',
      createdAt: now(),
    })
  }
  await db.update(assets).set({ contentItemId, updatedAt: now() }).where(eq(assets.id, assetId))
  return getAsset(db, assetId)
}

export async function attachAssetToCampaign(db: Database, assetId: number, campaignId: number) {
  const asset = await getAsset(db, assetId)
  if (asset.archived) {
    throw new DomainError('Archived assets cannot be attached.')
  }
  const [existing] = await db.select().from(assetUsages).where(and(
    eq(assetUsages.assetId, assetId),
    eq(assetUsages.campaignId, campaignId),
  )).limit(1)
  if (!existing) {
    await db.insert(assetUsages).values({
      assetId,
      campaignId,
      usageKind: 'ATTACHED',
      createdAt: now(),
    })
  }
  return getAsset(db, assetId)
}

export async function assertAssetsAllowPublication(db: Database, contentItemId: number) {
  const usages = await db.select().from(assetUsages).where(eq(assetUsages.contentItemId, contentItemId))
  if (!usages.length) {
    return
  }
  const attached = await db.select().from(assets)
  const used = attached.filter(asset => usages.some(usage => usage.assetId === asset.id))
  if (used.some(asset => asset.marketingUseStatus === 'DO_NOT_USE')) {
    throw new DomainError('A DO_NOT_USE asset is attached and cannot be used in publishable content.')
  }
  if (used.some(asset => asset.marketingUseStatus === 'RESTRICTED' && !asset.restrictionNote)) {
    throw new DomainError('A restricted asset is missing its restriction note.')
  }
}

export async function deleteAsset(db: Database, id: number) {
  const asset = await getAsset(db, id)
  if (asset.usages.length) {
    throw new DomainError('This asset was used in marketing history. Archive it instead.')
  }
  await db.delete(assets).where(eq(assets.id, id))
  try {
    unlinkSync(join(uploadsDirectory(), asset.storagePath))
  } catch {
    // File may already be gone.
  }
}
