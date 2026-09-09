import { describe, expect, it } from 'vitest'
import {
  addCampaignTrackingLink,
  createCampaign,
  trackingPath,
} from '../../server/services/campaigns'
import { listPublicSlots } from '../../server/services/availability'
import { bookPublicTrial } from '../../server/services/public-trial'
import { openTestDatabase } from '../helpers/db'

const MONDAY = Date.parse('2026-08-31T21:00:00.000Z')

describe('M8 campaigns and tracking links', () => {
  it('creates organic and paid campaigns with a default reusable tracking link', async () => {
    const testDb = await openTestDatabase()
    try {
      const organic = await createCampaign(testDb.db, {
        name: 'Back to School Trial',
        kind: 'ORGANIC',
      })
      expect(organic.kind).toBe('ORGANIC')
      expect(organic.budgetCents).toBeNull()
      expect(organic.trackingLinks).toHaveLength(1)
      expect(organic.trackingLinks[0]?.isDefault).toBe(true)
      expect(trackingPath(organic.trackingLinks[0]!)).toContain('/trial?')
      expect(trackingPath(organic.trackingLinks[0]!)).toContain(`c=${organic.trackingLinks[0]!.code}`)

      const paid = await createCampaign(testDb.db, {
        name: 'Kids Wrestling Boot Camp',
        kind: 'PAID',
        budgetCents: 50000,
      })
      expect(paid.kind).toBe('PAID')
      expect(paid.budgetCents).toBe(50000)
      expect(paid.trackingLinks[0]?.utmCampaign).toBe(paid.slug)
    } finally {
      await testDb.close()
    }
  })

  it('attributes public /trial bookings to the campaign, not a fake Facebook/Instagram split', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'General Trial Promotion' })
      const extra = await addCampaignTrackingLink(testDb.db, campaign.id, { label: 'Flyer QR' })
      const defaultLink = extra.trackingLinks.find(link => link.isDefault)!
      const flyer = extra.trackingLinks.find(link => link.label === 'Flyer QR')!
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })

      const fromDefault = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Alex',
        lastName: 'Instagram',
        phone: '8015555100',
        slotId: slots[0]!.id,
        trackingCode: defaultLink.code,
      }, { nowMs: MONDAY })
      expect(fromDefault.lead.campaignId).toBe(campaign.id)
      expect(fromDefault.lead.campaignTrackingLinkId).toBe(defaultLink.id)

      const fromFlyer = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Pat',
        lastName: 'Flyer',
        phone: '8015555101',
        slotId: slots[1]!.id,
        trackingCode: flyer.code,
        utmSource: 'print',
      }, { nowMs: MONDAY })
      expect(fromFlyer.lead.campaignId).toBe(campaign.id)
      expect(fromFlyer.lead.campaignTrackingLinkId).toBe(flyer.id)
      expect(fromFlyer.lead.utmSource).toBe('print')
      expect(fromDefault.lead.campaignId).toBe(fromFlyer.lead.campaignId)
    } finally {
      await testDb.close()
    }
  })

  it('still resolves the legacy campaign slug query', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'Fall Adult', slug: 'fall-adult-bjj' })
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const booked = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Retry',
        lastName: 'User',
        phone: '8015555110',
        slotId: slots[0]!.id,
        campaign: 'fall-adult-bjj',
      }, { nowMs: MONDAY })
      expect(booked.lead.campaignId).toBe(campaign.id)
    } finally {
      await testDb.close()
    }
  })
})
