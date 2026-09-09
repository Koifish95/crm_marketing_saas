import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { users, assetUsages } from '../../server/database/schema'
import { attachAssetToCampaign, attachAssetToContent, createAsset, deleteAsset, getAsset, listAssets, updateAsset } from '../../server/services/assets'
import { createCampaign } from '../../server/services/campaigns'
import { createContentItem, recordContentPublication } from '../../server/services/content'
import { utcNowMs } from '../../shared/utils/time'
import { assetStaffPath } from '../../shared/utils/asset'
import { openTestDatabase } from '../helpers/db'

describe('M9 assets', () => {
  it('stores metadata on disk, requires a RESTRICTED note, and blocks DO_NOT_USE publication', async () => {
    const testDb = await openTestDatabase()
    const dir = mkdtempSync(join(tmpdir(), 'renzo-assets-'))
    process.env.ASSET_UPLOAD_DIR = dir
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      const asset = await createAsset(testDb.db, {
        displayName: 'Kids class photo',
        originalFilename: 'kids.jpg',
        mediaType: 'image/jpeg',
        bytes: Buffer.from('fake-image'),
      }, actor)
      expect(asset.storagePath.length).toBeGreaterThan(8)
      await expect(updateAsset(testDb.db, asset.id, { marketingUseStatus: 'RESTRICTED' }))
        .rejects.toMatchObject({ message: expect.stringContaining('restriction note') })
      await updateAsset(testDb.db, asset.id, {
        marketingUseStatus: 'RESTRICTED',
        restrictionNote: 'Faces of minors; gym staff only',
      })
      const blocked = await createAsset(testDb.db, {
        displayName: 'Do not use clip',
        originalFilename: 'no.mp4',
        mediaType: 'video/mp4',
        bytes: Buffer.from('nope'),
      }, actor)
      await expect(updateAsset(testDb.db, blocked.id, { marketingUseStatus: 'DO_NOT_USE' }))
        .rejects.toMatchObject({ message: expect.stringContaining('restriction note') })
      await updateAsset(testDb.db, blocked.id, {
        marketingUseStatus: 'DO_NOT_USE',
        restrictionNote: 'Do not use this clip in ads',
      })
      const content = await createContentItem(testDb.db, {
        title: 'Post',
        channels: ['FACEBOOK'],
        approvalRequired: false,
        status: 'DRAFT',
      }, actor)
      await attachAssetToContent(testDb.db, blocked.id, content.id)
      await expect(recordContentPublication(testDb.db, content.id, { channel: 'FACEBOOK' }, actor, true))
        .rejects.toMatchObject({ message: expect.stringContaining('DO_NOT_USE') })
      await expect(deleteAsset(testDb.db, blocked.id))
        .rejects.toMatchObject({ message: expect.stringContaining('Archive') })
    } finally {
      await testDb.close()
      rmSync(dir, { recursive: true, force: true })
      delete process.env.ASSET_UPLOAD_DIR
    }
  })

  it('lists assets by campaign column and asset usage', async () => {
    const testDb = await openTestDatabase()
    const dir = mkdtempSync(join(tmpdir(), 'renzo-assets-'))
    process.env.ASSET_UPLOAD_DIR = dir
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      const campaign = await createCampaign(testDb.db, { name: 'Asset Filter Campaign' })
      const other = await createCampaign(testDb.db, { name: 'Other Asset Campaign' })
      const direct = await createAsset(testDb.db, {
        displayName: 'Direct',
        originalFilename: 'direct.jpg',
        mediaType: 'image/jpeg',
        bytes: Buffer.from('direct'),
        campaignId: campaign.id,
      }, actor)
      const viaUsage = await createAsset(testDb.db, {
        displayName: 'Usage only',
        originalFilename: 'usage.jpg',
        mediaType: 'image/jpeg',
        bytes: Buffer.from('usage'),
      }, actor)
      await testDb.db.insert(assetUsages).values({
        assetId: viaUsage.id,
        campaignId: campaign.id,
        usageKind: 'ATTACHED',
        createdAt: new Date(utcNowMs()),
      })
      await createAsset(testDb.db, {
        displayName: 'Other campaign file',
        originalFilename: 'other.jpg',
        mediaType: 'image/jpeg',
        bytes: Buffer.from('other'),
        campaignId: other.id,
      }, actor)
      const listed = await listAssets(testDb.db, { campaignId: campaign.id })
      expect(listed.map(item => item.id).sort()).toEqual([direct.id, viaUsage.id].sort())
      const library = await createAsset(testDb.db, {
        displayName: 'Linked later',
        originalFilename: 'later.jpg',
        mediaType: 'image/jpeg',
        bytes: Buffer.from('later'),
      }, actor)
      await attachAssetToCampaign(testDb.db, library.id, campaign.id)
      const afterLink = await listAssets(testDb.db, { campaignId: campaign.id })
      expect(afterLink.map(item => item.id).sort()).toEqual([direct.id, viaUsage.id, library.id].sort())
      expect(afterLink.find(item => item.id === library.id)?.campaignId).toBeNull()
      const loaded = await getAsset(testDb.db, library.id)
      expect(loaded.usages.some(usage => usage.campaign?.name === 'Asset Filter Campaign')).toBe(true)
      const content = await createContentItem(testDb.db, {
        title: 'Usage content',
        channels: ['FACEBOOK'],
        approvalRequired: false,
        status: 'DRAFT',
        campaignId: campaign.id,
      }, actor)
      await attachAssetToContent(testDb.db, library.id, content.id)
      const withContent = await getAsset(testDb.db, library.id)
      expect(withContent.contentItem?.title).toBe('Usage content')
      expect(withContent.usages.some(usage => usage.contentItem?.title === 'Usage content')).toBe(true)
    } finally {
      await testDb.close()
      rmSync(dir, { recursive: true, force: true })
      delete process.env.ASSET_UPLOAD_DIR
    }
  })

  it('builds a staff asset path', () => {
    expect(assetStaffPath(18)).toBe('/marketing/assets/18')
  })
})
