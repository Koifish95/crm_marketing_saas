import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { acquisitionEventRegistrations, campaignTrackingLinks, programs, users } from '../../server/database/schema'
import {
  addCampaignTrackingLink,
  assertTrackingDestination,
  createCampaign,
  friendlyTrackingPath,
  resolveCampaignAttribution,
  resolvePublicTrackingSlug,
  trackingPath,
  updateCampaign,
  updateCampaignTrackingLink,
} from '../../server/services/campaigns'
import { maybeEstablishSystemCompensation } from '../../server/services/compensation'
import {
  addEventSession,
  createAcquisitionEvent,
  registerPublicEvent,
  updateAcquisitionEvent,
} from '../../server/services/events'
import { listPublicSlots } from '../../server/services/availability'
import { bookPublicTrial } from '../../server/services/public-trial'
import { isPublicPath } from '../../server/services/authorization'
import { attributionFromQuery } from '../../shared/utils/public-attribution'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase } from '../helpers/db'

const MONDAY = Date.parse('2026-08-31T21:00:00.000Z')

describe('M9 friendly campaign tracking links', () => {
  it('assigns a default public slug and keeps the raw ?c= path', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'September Campaign' })
      const link = campaign.trackingLinks[0]!
      expect(link.publicSlug).toBe('september-campaign')
      expect(friendlyTrackingPath(link)).toBe('/t/september-campaign')
      expect(trackingPath(link)).toContain('/trial?')
      expect(trackingPath(link)).toContain(`c=${link.code}`)
      const resolved = await resolvePublicTrackingSlug(testDb.db, 'September-Campaign')
      expect(resolved.destinationPath).toBe('/trial')
      expect(resolved.trackingCode).toBe(link.code)
      expect(resolved.campaign).toBe(campaign.slug)
      expect(resolved).not.toHaveProperty('campaignId')
      expect(resolved).not.toHaveProperty('id')
    } finally {
      await testDb.close()
    }
  })

  it('attributes a trial booking from the friendly slug using the existing tracking code', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'Friendly Trial Push' })
      const resolved = await resolvePublicTrackingSlug(testDb.db, campaign.trackingLinks[0]!.publicSlug)
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const booked = await bookPublicTrial(testDb.db, {
        path: 'ADULT',
        firstName: 'Casey',
        lastName: 'Link',
        phone: '8015556100',
        slotId: slots[0]!.id,
        trackingCode: resolved.trackingCode,
        campaign: resolved.campaign,
        utmSource: resolved.utmSource ?? undefined,
        utmMedium: resolved.utmMedium ?? undefined,
      }, { nowMs: MONDAY })
      expect(booked.lead.campaignId).toBe(campaign.id)
      expect(booked.lead.campaignTrackingLinkId).toBe(campaign.trackingLinks[0]!.id)
      expect(booked.lead.utmSource).toBe('campaign')
      expect(booked.lead.utmMedium).toBe('link')
      const credit = await maybeEstablishSystemCompensation(testDb.db, booked.lead.lines[0]!.id, {
        campaignId: booked.lead.campaignId,
        campaignTrackingLinkId: booked.lead.campaignTrackingLinkId,
      })
      expect(credit?.method).toBe('TRACKING_LINK')
    } finally {
      await testDb.close()
    }
  })

  it('resolves extra Facebook and Event slugs independently and stamps event registration', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const [kids] = await testDb.db.select().from(programs).where(eq(programs.code, 'KIDS_BJJ'))
      const campaign = await createCampaign(testDb.db, { name: 'September Campaign' })
      const withLinks = await addCampaignTrackingLink(testDb.db, campaign.id, {
        label: 'Facebook Post',
        publicSlug: 'september-facebook',
      })
      const actor = {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN' as const,
        mustChangePassword: false,
      }
      const event = await createAcquisitionEvent(testDb.db, {
        title: 'Kids Open House',
        programId: kids!.id,
        campaignId: campaign.id,
      }, actor)
      const session = await addEventSession(testDb.db, event.id, {
        name: 'Saturday',
        startsAt: new Date(utcNowMs() + 86_400_000),
        programId: kids!.id,
      })
      const published = await updateAcquisitionEvent(testDb.db, event.id, { status: 'PUBLISHED' })
      const withEvent = await addCampaignTrackingLink(testDb.db, campaign.id, {
        label: 'Open house flyer',
        publicSlug: 'september-open-house',
        destinationPath: `/events/${published.slug}`,
      })
      const facebook = withEvent.trackingLinks.find(link => link.publicSlug === 'september-facebook')!
      const eventLink = withEvent.trackingLinks.find(link => link.publicSlug === 'september-open-house')!
      expect(withLinks.trackingLinks.find(link => link.isDefault)?.publicSlug).toBe('september-campaign')
      expect((await resolvePublicTrackingSlug(testDb.db, 'september-facebook')).trackingCode).toBe(facebook.code)
      const resolvedEvent = await resolvePublicTrackingSlug(testDb.db, 'september-open-house')
      expect(resolvedEvent.destinationPath).toBe(`/events/${published.slug}`)
      const registration = await registerPublicEvent(testDb.db, event.id, {
        firstName: 'Morgan',
        lastName: 'Hall',
        phone: '8015556101',
        trackingCode: resolvedEvent.trackingCode,
        campaign: resolvedEvent.campaign,
        utmSource: resolvedEvent.utmSource ?? undefined,
        utmMedium: resolvedEvent.utmMedium ?? undefined,
        participants: [{ firstName: 'Riley', lastName: 'Hall', age: 8, sessionId: session.id }],
      })
      const [row] = await testDb.db.select().from(acquisitionEventRegistrations)
        .where(eq(acquisitionEventRegistrations.id, registration.id))
      expect(row?.campaignId).toBe(campaign.id)
      expect(row?.campaignTrackingLinkId).toBe(eventLink.id)
      expect(row?.utmSource).toBe('campaign')
    } finally {
      await testDb.close()
    }
  })

  it('rejects duplicate slugs, invalid destinations, and missing or cancelled links', async () => {
    const testDb = await openTestDatabase()
    try {
      const first = await createCampaign(testDb.db, { name: 'September Campaign' })
      await expect(addCampaignTrackingLink(testDb.db, first.id, {
        label: 'Taken',
        publicSlug: 'september-campaign',
      })).rejects.toMatchObject({ statusCode: 409 })
      const second = await createCampaign(testDb.db, { name: 'October Campaign' })
      await expect(updateCampaignTrackingLink(testDb.db, second.id, second.trackingLinks[0]!.id, {
        publicSlug: 'september-campaign',
      })).rejects.toMatchObject({ statusCode: 409 })
      await expect(addCampaignTrackingLink(testDb.db, first.id, {
        label: 'Bad dest',
        destinationPath: 'https://evil.example',
      })).rejects.toThrow('Tracking destination must be /trial or an event page.')
      expect(() => assertTrackingDestination('//evil.example')).toThrow('Tracking destination must be /trial or an event page.')
      expect(() => assertTrackingDestination('/settings')).toThrow('Tracking destination must be /trial or an event page.')
      await expect(resolvePublicTrackingSlug(testDb.db, 'does-not-exist')).rejects.toMatchObject({ statusCode: 404 })
      await updateCampaign(testDb.db, first.id, { status: 'CANCELLED' })
      await expect(resolvePublicTrackingSlug(testDb.db, 'september-campaign')).rejects.toMatchObject({ statusCode: 404 })
      const inactive = await createCampaign(testDb.db, { name: 'Inactive Link' })
      await testDb.db.update(campaignTrackingLinks)
        .set({ active: false })
        .where(eq(campaignTrackingLinks.id, inactive.trackingLinks[0]!.id))
      await expect(resolvePublicTrackingSlug(testDb.db, inactive.trackingLinks[0]!.publicSlug)).rejects.toMatchObject({ statusCode: 404 })
    } finally {
      await testDb.close()
    }
  })

  it('keeps old tracking codes working after a slug edit', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'Rename Me' })
      const original = campaign.trackingLinks[0]!
      const updated = await updateCampaignTrackingLink(testDb.db, campaign.id, original.id, {
        publicSlug: 'renamed-friendly',
        label: 'Default',
      })
      const link = updated.trackingLinks[0]!
      expect(link.code).toBe(original.code)
      expect(link.publicSlug).toBe('renamed-friendly')
      expect((await resolvePublicTrackingSlug(testDb.db, 'renamed-friendly')).trackingCode).toBe(original.code)
      await expect(resolvePublicTrackingSlug(testDb.db, original.publicSlug)).rejects.toMatchObject({ statusCode: 404 })
      const attributed = await resolveCampaignAttribution(testDb.db, { trackingCode: original.code })
      expect(attributed.campaignId).toBe(campaign.id)
      expect(attributed.campaignTrackingLinkId).toBe(original.id)
    } finally {
      await testDb.close()
    }
  })

  it('reads public query attribution without changing the stored shape', () => {
    expect(attributionFromQuery({
      c: 'abc123def456',
      utm_source: 'campaign',
      utm_medium: 'link',
    })).toEqual({
      source: undefined,
      campaign: undefined,
      trackingCode: 'abc123def456',
      utmSource: 'campaign',
      utmMedium: 'link',
      utmContent: undefined,
      utmTerm: undefined,
    })
    expect(isPublicPath('/t/september-campaign')).toBe(true)
    expect(isPublicPath('/api/public/tracking/september-campaign')).toBe(true)
  })
})
