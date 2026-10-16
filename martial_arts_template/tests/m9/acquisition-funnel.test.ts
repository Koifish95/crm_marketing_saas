import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'
import { createEvent, getCookie } from 'h3'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { publicAcquisitionEventSchema } from '../../shared/schemas/acquisition-funnel'
import {
  ACQUISITION_FUNNEL_ACTIVATED_AT_KEY,
  JOURNEY_COOKIE,
  ageBandForAvailability,
  bookingFailureCategory,
  claimClientEvent,
  classTimeSelection,
  deviceClassFromUserAgent,
  isRepeatedSubmitTap,
} from '../../shared/utils/acquisition-funnel'
import { attributionFromQuery, trackingRedirectPath } from '../../shared/utils/public-attribution'
import availabilityHandler from '../../server/api/public/availability.get'
import { setUseDbForTests } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { acquisitionFunnelEvents, appSettings, campaigns, trials } from '../../server/database/schema'
import {
  insertFunnelEvent,
  notePublicAvailability,
  observeAcquisitionRequest,
  readFunnelActivatedAt,
  recordPublicAcquisitionEvent,
  recordTrialPageView,
  safeRecordBookingFailed,
  safeRecordTrialScheduled,
} from '../../server/services/acquisition-funnel'
import { getCampaignAcquisitionFunnel } from '../../server/services/acquisition-funnel-report'
import { listPublicSlots } from '../../server/services/availability'
import { createCampaign, resolvePublicTrackingSlug } from '../../server/services/campaigns'
import { bookPublicHousehold } from '../../server/services/public-trial'
import { snapshotSqliteFile } from '../../server/services/sqlite-snapshot'
import { resetPublicRateLimit } from '../../server/utils/rate-limit'
import { openTestDatabase } from '../helpers/db'

const MONDAY = Date.parse('2026-08-31T21:00:00.000Z')

function requestEvent(path: string, headers: Record<string, string> = {}) {
  const req = {
    method: 'GET',
    url: path,
    headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])),
    socket: { encrypted: false },
  }
  const sent = new Map<string, string | number | string[]>()
  const res = {
    statusCode: 200,
    setHeader(name: string, value: string | number | string[]) {
      sent.set(name.toLowerCase(), value)
    },
    getHeader(name: string) {
      return sent.get(name.toLowerCase())
    },
    end() {},
  }
  return {
    event: createEvent(req as IncomingMessage, res as ServerResponse),
    sent,
  }
}

function cookiePair(sent: Map<string, string | number | string[]>) {
  const value = sent.get('set-cookie')
  const raw = Array.isArray(value) ? value[0] : String(value ?? '')
  return raw.split(';')[0] ?? ''
}

function brokenInsert(db: object) {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'insert') {
        return () => {
          throw new Error('analytics unavailable')
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

describe('acquisition funnel analytics', () => {
  it('classifies devices, age bands, and booking failures without storing a user agent', () => {
    expect(deviceClassFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('MOBILE')
    expect(deviceClassFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('TABLET')
    expect(deviceClassFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('DESKTOP')
    expect(deviceClassFromUserAgent('')).toBe('UNKNOWN')
    expect(ageBandForAvailability('ADULT_BJJ', 30)).toBe('ADULT')
    expect(ageBandForAvailability('KIDS_BJJ', 7)).toBe('7-9')
    expect(ageBandForAvailability('KIDS_BJJ', null)).toBe('UNSPECIFIED')
    expect(bookingFailureCategory({ status: 400, message: 'Child age is required.' })).toBe('VALIDATION')
    expect(bookingFailureCategory({ status: 400, message: 'That intro time is not available.' })).toBe('SLOT_UNAVAILABLE')
    expect(bookingFailureCategory({ status: 429, message: 'Too many scheduling attempts.' })).toBe('RATE_LIMITED')
    expect(bookingFailureCategory({ status: 500, message: 'database' })).toBe('SERVER')
    expect(bookingFailureCategory({ message: 'Failed to fetch' })).toBe('NETWORK')
  })

  it('dedupes page views, repeated taps, and rerendered class selections', () => {
    const sent = new Set<string>()
    expect(claimClientEvent(sent, 'trial_page_viewed:2026-10-06')).toBe(true)
    expect(claimClientEvent(sent, 'trial_page_viewed:2026-10-06')).toBe(false)
    expect(isRepeatedSubmitTap(1_000, 1_200)).toBe(true)
    expect(isRepeatedSubmitTap(1_000, 3_000)).toBe(false)
    expect(classTimeSelection({
      slotId: '',
      program: 'ADULT_BJJ',
      startMinute: 18 * 60,
      todayYmd: '2026-10-06',
      weekday: 1,
    })).toBeNull()
    expect(claimClientEvent(sent, 'class:rule:4:2026-10-08')).toBe(true)
    expect(claimClientEvent(sent, 'class:rule:4:2026-10-08')).toBe(false)
    expect(claimClientEvent(sent, 'class:rule:5:2026-10-08')).toBe(true)
  })

  it('records a valid tracking link, keeps the redirect, and ignores invalid slugs', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'October Funnel' })
      const link = campaign.trackingLinks[0]!
      const reached = requestEvent(`/t/${link.publicSlug}`, { 'user-agent': 'Mozilla/5.0 (iPhone)' })
      await observeAcquisitionRequest(reached.event, testDb.db)
      const rows = await testDb.db.select().from(acquisitionFunnelEvents)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        eventType: 'tracking_link_reached',
        campaignId: campaign.id,
        campaignTrackingLinkId: link.id,
        trackingCode: link.code,
        deviceClass: 'MOBILE',
      })
      expect(cookiePair(reached.sent)).toContain(`${JOURNEY_COOKIE}=`)
      const resolved = await resolvePublicTrackingSlug(testDb.db, link.publicSlug)
      const redirect = trackingRedirectPath({
        destinationPath: resolved.destinationPath,
        trackingCode: resolved.trackingCode,
        campaign: resolved.campaign,
        utmSource: resolved.utmSource,
        utmMedium: resolved.utmMedium,
      })
      expect(redirect.startsWith('/trial?')).toBe(true)
      expect(attributionFromQuery(Object.fromEntries(new URL(redirect, 'http://127.0.0.1').searchParams))).toMatchObject({
        trackingCode: link.code,
        campaign: campaign.slug,
      })
      expect(resolved).not.toHaveProperty('campaignId')

      const again = requestEvent(`/t/${link.publicSlug}`, { cookie: cookiePair(reached.sent) })
      await observeAcquisitionRequest(again.event, testDb.db)
      expect(await testDb.db.select().from(acquisitionFunnelEvents)).toHaveLength(1)

      await observeAcquisitionRequest(requestEvent('/t/not-a-campaign').event, testDb.db)
      const afterInvalid = await testDb.db.select().from(acquisitionFunnelEvents)
      expect(afterInvalid).toHaveLength(1)
      expect(afterInvalid[0]?.campaignId).toBe(campaign.id)

      await observeAcquisitionRequest(requestEvent('/trial', { purpose: 'prefetch' }).event, testDb.db)
      expect(await testDb.db.select().from(acquisitionFunnelEvents)).toHaveLength(1)

      await expect(observeAcquisitionRequest(requestEvent(`/t/${link.publicSlug}`).event, brokenInsert(testDb.db) as never)).resolves.toBeUndefined()
      expect((await resolvePublicTrackingSlug(testDb.db, link.publicSlug)).destinationPath).toBe('/trial')
    } finally {
      await testDb.close()
    }
  })

  it('records direct and attributed trial views once per journey per day', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'View Campaign' })
      const link = campaign.trackingLinks[0]!
      const direct = requestEvent('/trial')
      await recordTrialPageView(testDb.db, direct.event)
      const directCookie = cookiePair(direct.sent)
      await recordTrialPageView(testDb.db, requestEvent('/trial', { cookie: directCookie }).event)
      const attributed = requestEvent(`/trial?c=${link.code}&campaign=${campaign.slug}&utm_source=meta&utm_medium=paid`)
      await recordTrialPageView(testDb.db, attributed.event)
      const rows = await testDb.db.select().from(acquisitionFunnelEvents)
      expect(rows.filter(row => row.eventType === 'trial_page_viewed')).toHaveLength(2)
      expect(rows.find(row => row.campaignId == null)?.route).toBe('/trial')
      const paid = rows.find(row => row.campaignId === campaign.id)
      expect(paid?.trackingCode).toBe(link.code)
      expect(paid?.utmSource).toBe('meta')
      expect(paid?.utmMedium).toBe('paid')
    } finally {
      await testDb.close()
    }
  })

  it('rejects personal data and accepts safe booking, program, and path events', async () => {
    const testDb = await openTestDatabase()
    try {
      const leaked = {
        type: 'program_selected',
        metadata: { program: 'KIDS_BJJ', age: 7, firstName: 'Sam' },
        phone: '8015550199',
        email: 'sam@example.com',
      }
      expect(publicAcquisitionEventSchema.safeParse(leaked).success).toBe(false)
      const event = requestEvent('/trial')
      expect(await recordPublicAcquisitionEvent(testDb.db, event.event, leaked)).toBe('rejected')
      expect(await recordPublicAcquisitionEvent(testDb.db, event.event, {
        type: 'booking_started',
      })).toBe('recorded')
      expect(await recordPublicAcquisitionEvent(testDb.db, event.event, {
        type: 'participant_path_selected',
        metadata: { path: 'CHILD' },
      })).toBe('recorded')
      expect(await recordPublicAcquisitionEvent(testDb.db, event.event, {
        type: 'program_selected',
        metadata: { program: 'KIDS_BJJ' },
      })).toBe('recorded')
      expect(await recordPublicAcquisitionEvent(testDb.db, event.event, {
        type: 'tracking_link_reached',
      })).toBe('rejected')
      expect(await recordPublicAcquisitionEvent(testDb.db, event.event, {
        type: 'trial_scheduled',
      })).toBe('rejected')
      const rows = await testDb.db.select().from(acquisitionFunnelEvents)
      const blob = JSON.stringify(rows)
      expect(blob).not.toContain('8015550199')
      expect(blob).not.toContain('sam@example.com')
      expect(blob).not.toContain('Sam')
      expect(blob).not.toContain('"age"')
      expect(rows.map(row => row.eventType).sort()).toEqual(['booking_started', 'participant_path_selected', 'program_selected'])
    } finally {
      await testDb.close()
    }
  })

  it('separates available, empty, and failed availability without blocking the schedule', async () => {
    const testDb = await openTestDatabase()
    setUseDbForTests(testDb.db)
    resetPublicRateLimit()
    try {
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      expect(slots.length).toBeGreaterThan(0)
      const loaded = await availabilityHandler(requestEvent('/api/public/availability?program=ADULT_BJJ').event)
      expect(Array.isArray(loaded)).toBe(true)
      expect(loaded.length).toBeGreaterThan(0)
      const kidGap = await availabilityHandler(requestEvent('/api/public/availability?program=KIDS_BJJ').event)
      expect(kidGap).toEqual([])
      await notePublicAvailability(testDb.db, requestEvent('/api/public/availability?program=KIDS_BJJ&age=7').event, {
        program: 'KIDS_BJJ',
        age: 7,
        outcome: 'EMPTY',
        resultCount: 0,
      })
      await notePublicAvailability(testDb.db, requestEvent('/api/public/availability?program=ADULT_BJJ').event, {
        program: 'ADULT_BJJ',
        outcome: 'ERROR',
        resultCount: 99,
      })
      const rows = await testDb.db.select().from(acquisitionFunnelEvents)
      const outcomes = rows
        .filter(row => row.eventType === 'availability_result')
        .map(row => JSON.parse(row.metadata ?? '{}') as { outcome: string, ageBand?: string, age?: number })
      expect(outcomes.map(row => row.outcome).sort()).toEqual(['AVAILABLE', 'EMPTY', 'ERROR'])
      expect(outcomes.find(row => row.outcome === 'EMPTY')?.ageBand).toBe('7-9')
      expect(outcomes.every(row => row.age == null)).toBe(true)
      expect(JSON.stringify(rows)).not.toContain('"age"')

      setUseDbForTests(brokenInsert(testDb.db) as never)
      const stillLoaded = await availabilityHandler(requestEvent('/api/public/availability?program=ADULT_BJJ').event)
      expect(stillLoaded.length).toBeGreaterThan(0)
    } finally {
      setUseDbForTests(undefined)
      await testDb.close()
    }
  })

  it('records a scheduled trial once, keeps the booking when analytics fails, and omits contact data', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'Book Campaign' })
      const link = campaign.trackingLinks[0]!
      const slots = await listPublicSlots(testDb.db, { programCode: 'ADULT_BJJ', nowMs: MONDAY })
      const booked = await bookPublicHousehold(testDb.db, {
        firstName: 'Alex',
        lastName: 'Adult',
        phone: '8015556100',
        email: 'alex@example.com',
        trackingCode: link.code,
        campaign: campaign.slug,
        members: [{
          relationship: 'SELF',
          firstName: 'Alex',
          lastName: 'Adult',
          programCode: 'ADULT_BJJ',
          slotId: slots[0]!.id,
        }],
      }, { nowMs: MONDAY })
      const journey = requestEvent('/trial')
      await safeRecordTrialScheduled(testDb.db, journey.event, {
        leadId: booked.lead.id,
        attribution: {
          campaignId: campaign.id,
          campaignTrackingLinkId: link.id,
          trackingCode: link.code,
          utmSource: 'meta',
          utmMedium: 'paid',
          utmContent: null,
          utmTerm: null,
        },
      })
      await safeRecordTrialScheduled(testDb.db, journey.event, {
        leadId: booked.lead.id,
        journeyId: getCookie(journey.event, JOURNEY_COOKIE),
      })
      await safeRecordBookingFailed(testDb.db, journey.event, {
        status: 400,
        message: 'That intro time is not available.',
        idempotencyKey: '11111111-1111-4111-8111-111111111111',
        attribution: {
          campaignId: campaign.id,
          campaignTrackingLinkId: link.id,
          trackingCode: link.code,
          utmSource: null,
          utmMedium: null,
          utmContent: null,
          utmTerm: null,
        },
      })
      const page = requestEvent('/trial', { cookie: cookiePair(journey.sent) })
      await recordPublicAcquisitionEvent(testDb.db, page.event, {
        type: 'booking_submit_attempted',
        metadata: { idempotencyKey: '11111111-1111-4111-8111-111111111111' },
        trackingCode: link.code,
        campaign: campaign.slug,
      })
      await recordPublicAcquisitionEvent(testDb.db, page.event, {
        type: 'booking_submit_attempted',
        metadata: { idempotencyKey: '11111111-1111-4111-8111-111111111111' },
        trackingCode: link.code,
      })
      await recordPublicAcquisitionEvent(testDb.db, page.event, {
        type: 'phone_clicked',
        metadata: { placement: 'supporting' },
        trackingCode: link.code,
      })
      await recordPublicAcquisitionEvent(testDb.db, page.event, {
        type: 'directions_clicked',
        metadata: { placement: 'supporting' },
        trackingCode: link.code,
      })
      const rows = await testDb.db.select().from(acquisitionFunnelEvents)
      expect(rows.filter(row => row.eventType === 'trial_scheduled')).toHaveLength(1)
      expect(rows.filter(row => row.eventType === 'booking_submit_attempted')).toHaveLength(1)
      expect(rows.filter(row => row.eventType === 'booking_failed')).toHaveLength(1)
      expect(JSON.parse(rows.find(row => row.eventType === 'booking_failed')?.metadata ?? '{}').category).toBe('SLOT_UNAVAILABLE')
      expect(rows.filter(row => row.eventType === 'phone_clicked')).toHaveLength(1)
      expect(rows.filter(row => row.eventType === 'directions_clicked')).toHaveLength(1)
      const blob = JSON.stringify(rows)
      expect(blob).not.toContain('Alex')
      expect(blob).not.toContain('8015556100')
      expect(blob).not.toContain('alex@example.com')
      const scheduled = rows.find(row => row.eventType === 'trial_scheduled')
      expect(scheduled?.leadId).toBe(booked.lead.id)
      expect(scheduled?.campaignId).toBe(campaign.id)
      const household = await testDb.db.select().from(trials).where(eq(trials.leadId, booked.lead.id))
      expect(household).toHaveLength(1)

      const broken = new Proxy(testDb.db, {
        get(target, prop, receiver) {
          if (prop === 'insert' || prop === 'update') {
            return () => {
              throw new Error('analytics unavailable')
            }
          }
          const value = Reflect.get(target, prop, receiver)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      await expect(safeRecordTrialScheduled(broken as never, undefined, { leadId: booked.lead.id, journeyId: scheduled?.journeyId })).resolves.toBeUndefined()
      expect(await testDb.db.select().from(trials).where(eq(trials.leadId, booked.lead.id))).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('counts unique campaign journeys and ignores events from before activation', async () => {
    const testDb = await openTestDatabase()
    try {
      const activatedAt = await readFunnelActivatedAt(testDb.db)
      expect(activatedAt).not.toBeNull()
      const campaign = await createCampaign(testDb.db, { name: 'Funnel Report' })
      const other = await createCampaign(testDb.db, { name: 'Other Campaign' })
      const link = campaign.trackingLinks[0]!
      const journey = '11111111-1111-4111-8111-111111111111'
      const partial = '22222222-2222-4222-8222-222222222222'
      const now = new Date()
      async function add(journeyId: string, eventType: 'tracking_link_reached' | 'trial_page_viewed' | 'booking_started' | 'class_time_selected' | 'booking_submit_attempted' | 'trial_scheduled', metadata?: Record<string, unknown>, leadId?: number) {
        await insertFunnelEvent(testDb.db, {
          journeyId,
          eventType,
          dedupeKey: `${eventType}:${journeyId}:test`,
          occurredAt: now,
          campaignId: campaign.id,
          campaignTrackingLinkId: link.id,
          trackingCode: link.code,
          deviceClass: 'MOBILE',
          metadata,
          leadId,
        })
      }
      await add(journey, 'tracking_link_reached', { trackingLinkId: link.id })
      await add(journey, 'trial_page_viewed')
      await add(journey, 'booking_started')
      await insertFunnelEvent(testDb.db, {
        journeyId: journey,
        eventType: 'availability_result',
        dedupeKey: `availability:${journey}`,
        occurredAt: now,
        campaignId: campaign.id,
        campaignTrackingLinkId: link.id,
        deviceClass: 'MOBILE',
        metadata: { program: 'ADULT_BJJ', ageBand: 'ADULT', outcome: 'AVAILABLE', resultCount: 4 },
      })
      await insertFunnelEvent(testDb.db, {
        journeyId: journey,
        eventType: 'program_selected',
        dedupeKey: `program:${journey}`,
        occurredAt: now,
        campaignId: campaign.id,
        metadata: { program: 'ADULT_BJJ' },
      })
      await insertFunnelEvent(testDb.db, {
        journeyId: journey,
        eventType: 'participant_path_selected',
        dedupeKey: `path:${journey}`,
        occurredAt: now,
        campaignId: campaign.id,
        metadata: { path: 'SELF' },
      })
      await add(journey, 'class_time_selected', { slotId: 'rule:1:2026-10-08' })
      await add(journey, 'booking_submit_attempted', { idempotencyKey: '33333333-3333-4333-8333-333333333333' })
      await add(partial, 'tracking_link_reached', { trackingLinkId: link.id })
      await add(partial, 'trial_page_viewed')
      await insertFunnelEvent(testDb.db, {
        journeyId: '44444444-4444-4444-8444-444444444444',
        eventType: 'trial_page_viewed',
        dedupeKey: 'direct-view',
        occurredAt: now,
        deviceClass: 'DESKTOP',
      })
      await insertFunnelEvent(testDb.db, {
        journeyId: '55555555-5555-4555-8555-555555555555',
        eventType: 'tracking_link_reached',
        dedupeKey: 'old-click',
        occurredAt: new Date((activatedAt ?? 0) - 86_400_000),
        campaignId: campaign.id,
        campaignTrackingLinkId: link.id,
        trackingCode: link.code,
      })
      await insertFunnelEvent(testDb.db, {
        journeyId: '66666666-6666-4666-8666-666666666666',
        eventType: 'trial_page_viewed',
        dedupeKey: 'other-campaign',
        occurredAt: now,
        campaignId: other.id,
      })

      const report = await getCampaignAcquisitionFunnel(testDb.db, campaign.id, {})
      expect(report.stages.map(stage => [stage.key, stage.journeys])).toEqual([
        ['tracking_link_reached', 2],
        ['trial_page_viewed', 2],
        ['booking_started', 1],
        ['availability_available', 1],
        ['class_time_selected', 1],
        ['booking_submit_attempted', 1],
        ['trial_scheduled', 0],
      ])
      expect(report.stages[1]?.rateFromPrevious).toBe(1)
      expect(report.stages[2]?.rateFromPrevious).toBe(0.5)
      expect(report.breakdowns.program).toEqual([{ key: 'ADULT_BJJ', journeys: 1 }])
      expect(report.breakdowns.path).toEqual([{ key: 'SELF', journeys: 1 }])
      expect(report.breakdowns.device.some(row => row.key === 'MOBILE')).toBe(true)
      expect(report.breakdowns.trackingLink[0]?.publicSlug).toBe(link.publicSlug)
      expect(report.activatedAt).toBeTruthy()
      expect(report.note).toContain('not in these stages')
      const settings = await testDb.db.select().from(appSettings).where(eq(appSettings.key, ACQUISITION_FUNNEL_ACTIVATED_AT_KEY))
      expect(settings).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })

  it('does not throw when funnel insert fails closed', async () => {
    const broken = {
      insert() {
        throw new Error('disk full')
      },
    }
    await expect(insertFunnelEvent(broken as never, {
      journeyId: '11111111-1111-4111-8111-111111111111',
      eventType: 'trial_page_viewed',
      dedupeKey: 'x',
    })).resolves.toBeUndefined()
  })

  it('provisions analytics on a new database, isolates environments, and keeps activation stable', async () => {
    const prod = await openTestDatabase()
    const dev = await openTestDatabase()
    const snap = join(tmpdir(), `ma-funnel-snap-${randomUUID()}.sqlite`)
    try {
      const prodActivated = await readFunnelActivatedAt(prod.db)
      const devActivated = await readFunnelActivatedAt(dev.db)
      expect(prodActivated).not.toBeNull()
      expect(devActivated).not.toBeNull()

      const campaign = await createCampaign(prod.db, { name: 'Prod Campaign' })
      await insertFunnelEvent(prod.db, {
        journeyId: '11111111-1111-4111-8111-111111111111',
        eventType: 'trial_page_viewed',
        dedupeKey: 'prod-only',
        campaignId: campaign.id,
      })
      await insertFunnelEvent(dev.db, {
        journeyId: '22222222-2222-4222-8222-222222222222',
        eventType: 'trial_page_viewed',
        dedupeKey: 'dev-only',
      })
      const prodRows = await prod.db.select().from(acquisitionFunnelEvents)
      const devRows = await dev.db.select().from(acquisitionFunnelEvents)
      expect(prodRows.map(row => row.dedupeKey)).toEqual(['prod-only'])
      expect(devRows.map(row => row.dedupeKey)).toEqual(['dev-only'])

      await migrateDatabase(prod.url)
      expect(await readFunnelActivatedAt(prod.db)).toBe(prodActivated)
      expect(await prod.db.select().from(campaigns).where(eq(campaigns.id, campaign.id))).toHaveLength(1)

      await snapshotSqliteFile(prod.url, snap)
      const restored = createClient({ url: `file:${snap.replaceAll('\\', '/')}` })
      try {
        const events = await restored.execute('SELECT dedupe_key FROM acquisition_funnel_events')
        expect(events.rows).toHaveLength(1)
        const setting = await restored.execute(`SELECT value FROM app_settings WHERE key = '${ACQUISITION_FUNNEL_ACTIVATED_AT_KEY}'`)
        expect(Number(setting.rows[0]?.value)).toBe(prodActivated)
        const names = await restored.execute('SELECT name FROM campaigns')
        expect(names.rows.map(row => row.name)).toContain('Prod Campaign')
      } finally {
        restored.close()
      }
    } finally {
      try {
        unlinkSync(snap)
      } catch {
        // Snapshot may not exist if an earlier assertion failed.
      }
      await prod.close()
      await dev.close()
    }
  })

  it('upgrades an existing database without resetting campaigns or moving a later activation', async () => {
    const testDb = await openTestDatabase()
    try {
      const campaign = await createCampaign(testDb.db, { name: 'Before Funnel' })
      await testDb.client.execute('DROP TABLE acquisition_funnel_events')
      await testDb.client.execute(`DELETE FROM app_settings WHERE key = '${ACQUISITION_FUNNEL_ACTIVATED_AT_KEY}'`)
      const migrationPath = fileURLToPath(new URL('../../drizzle/migrations/0021_cheerful_lethal_legion.sql', import.meta.url))
      const statements = readFileSync(migrationPath, 'utf8')
        .split('--> statement-breakpoint')
        .map(statement => statement.trim())
        .filter(Boolean)
      for (const statement of statements) {
        await testDb.client.execute(statement)
      }
      const activated = await readFunnelActivatedAt(testDb.db)
      expect(activated).not.toBeNull()
      const table = await testDb.client.execute('SELECT name FROM sqlite_master WHERE type = \'table\' AND name = \'acquisition_funnel_events\'')
      expect(table.rows).toHaveLength(1)
      const kept = await testDb.db.select().from(campaigns).where(eq(campaigns.id, campaign.id))
      expect(kept[0]?.name).toBe('Before Funnel')
      const activationSql = statements.find(statement => statement.includes('acquisition_funnel_activated_at'))
      expect(activationSql).toBeTruthy()
      await testDb.client.execute(activationSql!)
      expect(await readFunnelActivatedAt(testDb.db)).toBe(activated)
      expect((await testDb.db.select().from(campaigns).where(eq(campaigns.id, campaign.id)))[0]?.name).toBe('Before Funnel')
    } finally {
      await testDb.close()
    }
  })
})
