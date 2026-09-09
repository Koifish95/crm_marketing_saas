import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { followUpTasks, users } from '../../server/database/schema'
import { createCampaign } from '../../server/services/campaigns'
import { createMarketingTask, getMarketingTask, listMarketingTasks, updateMarketingTask } from '../../server/services/marketing-tasks'
import { utcNowMs } from '../../shared/utils/time'
import { marketingTaskStaffPath } from '../../shared/utils/task'
import { openTestDatabase } from '../helpers/db'

describe('M9 marketing tasks', () => {
  it('creates assigned tasks on a campaign without touching Follow-up', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      const campaign = await createCampaign(testDb.db, { name: 'Fall Awareness', budgetCents: 0 })
      const due = new Date(utcNowMs() + 36 * 60 * 60 * 1000)
      const task = await createMarketingTask(testDb.db, {
        title: 'Request five kids-class photos',
        type: 'ASSET_REQUEST',
        dueAt: due,
        assigneeUserId: admin!.id,
        campaignId: campaign.id,
      }, actor)
      expect(task.title).toContain('photos')
      expect(task.campaignId).toBe(campaign.id)
      const followUps = await testDb.db.select().from(followUpTasks)
      expect(followUps).toHaveLength(0)
      const upcoming = await listMarketingTasks(testDb.db, 'upcoming', utcNowMs())
      expect(upcoming.some(row => row.id === task.id)).toBe(true)
      const other = await createCampaign(testDb.db, { name: 'Unrelated Campaign' })
      await createMarketingTask(testDb.db, {
        title: 'Other campaign caption',
        dueAt: due,
        campaignId: other.id,
      }, actor)
      const scoped = await listMarketingTasks(testDb.db, 'all', utcNowMs(), { campaignId: campaign.id })
      expect(scoped.map(row => row.id)).toEqual([task.id])
    } finally {
      await testDb.close()
    }
  })

  it('completes a Marketing Task without creating a FollowUpTask', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      const created = await createMarketingTask(testDb.db, {
        title: 'Draft caption',
        type: 'DRAFT_CAPTION',
        dueAt: new Date(utcNowMs() - 60_000),
      }, actor)
      const completed = await updateMarketingTask(testDb.db, created.id, { status: 'COMPLETED' }, actor)
      expect(completed.status).toBe('COMPLETED')
      expect(completed.completedByUserId).toBe(admin!.id)
      const followUps = await testDb.db.select().from(followUpTasks).where(eq(followUpTasks.id, created.id))
      expect(followUps).toHaveLength(0)
    } finally {
      await testDb.close()
    }
  })

  it('loads a Marketing Task by id without creating Follow-up work', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      const created = await createMarketingTask(testDb.db, {
        title: 'Prepare creative',
        type: 'PREPARE_CREATIVE',
        dueAt: new Date(utcNowMs() + 3 * 86_400_000),
      }, actor)
      const loaded = await getMarketingTask(testDb.db, created.id)
      expect(loaded.title).toBe('Prepare creative')
      expect(loaded.type).toBe('PREPARE_CREATIVE')
      expect(loaded.dueState).toBe('UPCOMING')
      expect(marketingTaskStaffPath(created.id)).toBe(`/marketing/tasks/${created.id}`)
      await expect(getMarketingTask(testDb.db, 999_999)).rejects.toMatchObject({ statusCode: 404 })
      const followUps = await testDb.db.select().from(followUpTasks)
      expect(followUps).toHaveLength(0)
    } finally {
      await testDb.close()
    }
  })
})
