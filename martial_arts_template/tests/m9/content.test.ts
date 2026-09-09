import { describe, expect, it } from 'vitest'
import { users } from '../../server/database/schema'
import {
  approveContentItem,
  createContentItem,
  getContentItem,
  listContentItems,
  recordContentPublication,
  updateContentItem,
} from '../../server/services/content'
import { createCampaign } from '../../server/services/campaigns'
import { contentStaffPath } from '../../shared/utils/content'
import { openTestDatabase } from '../helpers/db'

function actorFrom(row: { id: number, email: string, displayName: string, role: string }) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as 'ADMIN',
    mustChangePassword: false,
  }
}

describe('M9 content workflow', () => {
  it('lets multi-channel content skip approval when not required', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const item = await createContentItem(testDb.db, {
        title: 'Kids class reel',
        channels: ['FACEBOOK', 'INSTAGRAM'],
        approvalRequired: false,
        status: 'DRAFT',
      }, actor)
      const ready = await updateContentItem(testDb.db, item.id, { status: 'READY_TO_PUBLISH' }, actor, false)
      expect(ready.status).toBe('READY_TO_PUBLISH')
      const published = await recordContentPublication(testDb.db, item.id, {
        channel: 'INSTAGRAM',
        publicUrl: 'https://instagram.com/p/example',
      }, actor, false)
      expect(published.status).toBe('PUBLISHED')
      expect(published.publications).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('blocks publish-ready until approval when required', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const item = await createContentItem(testDb.db, {
        title: 'Offer post',
        channels: ['FACEBOOK'],
        approvalRequired: true,
        status: 'NEEDS_REVIEW',
      }, actor)
      await expect(updateContentItem(testDb.db, item.id, { status: 'READY_TO_PUBLISH' }, actor, false))
        .rejects.toMatchObject({ message: expect.stringContaining('approval') })
      const approved = await approveContentItem(testDb.db, item.id, actor)
      expect(approved.status).toBe('APPROVED')
      expect(approved.approvedByUserId).toBe(admin!.id)
      const ready = await updateContentItem(testDb.db, item.id, { status: 'READY_TO_PUBLISH' }, actor, true)
      expect(ready.status).toBe('READY_TO_PUBLISH')
    } finally {
      await testDb.close()
    }
  })

  it('lists content items for one campaign', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = actorFrom(admin!)
      const campaign = await createCampaign(testDb.db, { name: 'Filter Content Campaign' })
      const other = await createCampaign(testDb.db, { name: 'Other Content Campaign' })
      const mine = await createContentItem(testDb.db, {
        title: 'Mine',
        channels: ['FACEBOOK'],
        campaignId: campaign.id,
      }, actor)
      await createContentItem(testDb.db, {
        title: 'Theirs',
        channels: ['INSTAGRAM'],
        campaignId: other.id,
      }, actor)
      const listed = await listContentItems(testDb.db, { campaignId: campaign.id })
      expect(listed.map(item => item.id)).toEqual([mine.id])
      const loaded = await getContentItem(testDb.db, mine.id)
      expect(loaded.title).toBe('Mine')
      expect(loaded.campaignId).toBe(campaign.id)
      expect(contentStaffPath(mine.id)).toBe(`/marketing/content/${mine.id}`)
      expect(contentStaffPath(mine.id, { campaignId: campaign.id })).toBe(`/marketing/content/${mine.id}?campaignId=${campaign.id}`)
    } finally {
      await testDb.close()
    }
  })
})
