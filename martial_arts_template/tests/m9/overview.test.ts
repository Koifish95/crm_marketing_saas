import { describe, expect, it } from 'vitest'
import { users } from '../../server/database/schema'
import { createCampaign } from '../../server/services/campaigns'
import { createContentItem } from '../../server/services/content'
import { createMarketingTask } from '../../server/services/marketing-tasks'
import { getCampaignPerformance, getMarketingOverview } from '../../server/services/marketing-overview'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

describe('M9 marketing command center', () => {
  it('summarizes active campaigns, overdue tasks, and labeled outcome sources without Meta credentials', async () => {
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
      const campaign = await createCampaign(testDb.db, {
        name: 'Fall Awareness',
        status: 'ACTIVE',
        budgetCents: 50000,
        ownerUserId: admin!.id,
      })
      await createMarketingTask(testDb.db, {
        title: 'Overdue caption',
        type: 'DRAFT_CAPTION',
        dueAt: new Date(utcNowMs() - 86_400_000),
        campaignId: campaign.id,
      }, actor)
      await createContentItem(testDb.db, {
        title: 'Needs a review',
        channels: ['FACEBOOK'],
        status: 'NEEDS_REVIEW',
        approvalRequired: true,
      }, actor)
      const overview = await getMarketingOverview(testDb.db, utcNowMs())
      expect(overview.activeCampaigns.some(row => row.id === campaign.id)).toBe(true)
      expect(overview.tasks.overdue).toBeGreaterThanOrEqual(1)
      expect(overview.content.needingReview).toBeGreaterThanOrEqual(1)
      const outcome = overview.campaignOutcomes.find(row => row.id === campaign.id)
      expect(outcome?.plannedBudgetSource).toBe('internal_crm')
      expect(outcome?.metaSpendSource).toBe('meta_reported')
      expect(outcome?.attributed.source).toBe('deterministically_attributed')
      expect(outcome?.mapped).toBe(false)
      expect(outcome?.metaSpendCents).toBe(0)
      const performance = await getCampaignPerformance(testDb.db, campaign.id)
      expect(performance.id).toBe(campaign.id)
      expect(performance.plannedBudgetSource).toBe('internal_crm')
      expect(performance.metaSpendSource).toBe('meta_reported')
      expect(performance.attributed.source).toBe('deterministically_attributed')
      expect(performance.mapped).toBe(false)
      expect(performance.mappedMetaCampaigns).toEqual([])
      expect(performance.notes.meta).toContain('explicitly mapped')
    } finally {
      await testDb.close()
    }
  })
})
