import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { programs, users } from '../../server/database/schema'
import {
  addCampaignTrackingLink,
  createCampaign,
  getCampaign,
  listCampaignSummaries,
  resolveCampaignAttribution,
  trackingPath,
  updateCampaign,
} from '../../server/services/campaigns'
import { createLead, getLead } from '../../server/services/leads'
import { listPublicSlots } from '../../server/services/availability'
import { bookPublicTrial } from '../../server/services/public-trial'
import { campaignLeadsPath, campaignStaffPath, parseCampaignHashId } from '../../shared/utils/campaign'
import { datetimeLocalValueToIso, denverWallToUtc, toDatetimeLocalValue } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

describe('M9 marketing campaigns', () => {
  it('allows a $0 organic campaign with owner, collaborators, and draft status', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const campaign = await createCampaign(testDb.db, {
        name: 'Kids Wrestling Fall 2026',
        kind: 'ORGANIC',
        status: 'DRAFT',
        budgetCents: 0,
        ownerUserId: admin!.id,
        collaboratorUserIds: [admin!.id],
        description: 'Fall awareness',
      })
      expect(campaign.status).toBe('DRAFT')
      expect(campaign.active).toBe(false)
      expect(campaign.budgetCents).toBe(0)
      expect(campaign.ownerUserId).toBe(admin!.id)
      expect(campaign.collaborators).toHaveLength(1)
      const attributed = await resolveCampaignAttribution(testDb.db, {
        trackingCode: campaign.trackingLinks[0]!.code,
      })
      expect(attributed.campaignId).toBe(campaign.id)
    } finally {
      await testDb.close()
    }
  })

  it('attributes tracking codes unless the campaign is cancelled', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, {
        name: 'September Kids Trial Push',
        status: 'PLANNED',
        budgetCents: 0,
      })
      const code = campaign.trackingLinks[0]!.code
      expect((await resolveCampaignAttribution(testDb.db, { trackingCode: code })).campaignId).toBe(campaign.id)
      const active = await updateCampaign(testDb.db, campaign.id, { status: 'ACTIVE' })
      expect(active.active).toBe(true)
      expect((await resolveCampaignAttribution(testDb.db, { trackingCode: code })).campaignId).toBe(campaign.id)
      await updateCampaign(testDb.db, campaign.id, { status: 'COMPLETED' })
      expect((await resolveCampaignAttribution(testDb.db, { trackingCode: code })).campaignId).toBe(campaign.id)
      await updateCampaign(testDb.db, campaign.id, { status: 'CANCELLED' })
      expect((await resolveCampaignAttribution(testDb.db, { trackingCode: code })).campaignId).toBeUndefined()
    } finally {
      await testDb.close()
    }
  })

  it('builds extra tracking links toward an event path without changing the default /trial link', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'Open House Push' })
      const withExtra = await addCampaignTrackingLink(testDb.db, campaign.id, {
        label: 'Open house flyer',
        destinationPath: '/events/kids-open-house',
      })
      const def = withExtra.trackingLinks.find(link => link.isDefault)!
      const extra = withExtra.trackingLinks.find(link => link.label === 'Open house flyer')!
      expect(trackingPath(def).startsWith('/trial?')).toBe(true)
      expect(trackingPath(extra).startsWith('/events/kids-open-house?')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('builds staff campaign and household filter paths', () => {
    expect(campaignStaffPath(12)).toBe('/marketing/campaigns/12')
    expect(campaignLeadsPath(12)).toBe('/leads?campaignId=12')
    expect(parseCampaignHashId('#campaign-12')).toBe(12)
    expect(parseCampaignHashId('#campaign-0')).toBeNull()
    expect(parseCampaignHashId('#other')).toBeNull()
  })

  it('converts datetime-local values in America/Denver', () => {
    const utc = denverWallToUtc('2026-09-03', 17 * 60)
    expect(toDatetimeLocalValue(utc.getTime())).toBe('2026-09-03T17:00')
    expect(datetimeLocalValueToIso('2026-09-03T17:00')).toBe(utc.toISOString())
    expect(datetimeLocalValueToIso('')).toBeNull()
  })

  it('includes attributed households on managed campaigns', async () => {
    const testDb = await openTestDatabase()
    try {
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      const campaign = await createCampaign(testDb.db, {
        name: 'Fall Adult Push',
        status: 'ACTIVE',
      })
      const lead = await createLead(testDb.db, {
        firstName: 'Alex',
        lastName: 'Rivera',
        phone: '8015550199',
        programId: adult!.id,
        source: 'INSTAGRAM',
        campaignId: campaign.id,
      })
      const listed = await listCampaignSummaries(testDb.db)
      const row = listed.find(item => item.id === campaign.id)
      expect(row?.householdCount).toBe(1)
      expect(row?.leads).toBeUndefined()
      const detail = await getCampaign(testDb.db, campaign.id)
      expect(detail.leads.map(item => item.id)).toContain(lead.id)
      expect(detail.leads.find(item => item.id === lead.id)?.firstName).toBe('Alex')
    } finally {
      await testDb.close()
    }
  })

  it('stamps a DRAFT campaign on a public /trial booking from the tracking code', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, {
        name: 'Draft Kids Push',
        status: 'DRAFT',
      })
      const code = campaign.trackingLinks[0]!.code
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: Date.parse('2026-08-31T21:00:00.000Z') })
      const booked = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Riley',
        lastName: 'Draft',
        phone: '8015555110',
        slotId: slots[0]!.id,
        trackingCode: code,
      }, { nowMs: Date.parse('2026-08-31T21:00:00.000Z') })
      expect(booked.lead.campaignId).toBe(campaign.id)
      const detail = await getLead(testDb.db, booked.lead.id)
      expect(detail.campaign?.id).toBe(campaign.id)
      expect(detail.trackingLink?.label).toBe('Default')
    } finally {
      await testDb.close()
    }
  })
})
