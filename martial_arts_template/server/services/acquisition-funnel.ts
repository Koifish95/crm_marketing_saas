import { randomUUID } from 'node:crypto'
import { and, desc, eq, gte, isNull } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getCookie, getMethod, getQuery, getRequestHeader, getRequestProtocol, getRequestURL, setCookie } from 'h3'
import type { Database } from '../database'
import { acquisitionFunnelEvents, appSettings, campaignTrackingLinks } from '../database/schema'
import { publicAcquisitionEventSchema, type PublicAcquisitionEvent } from '../../shared/schemas/acquisition-funnel'
import {
  ACQUISITION_FUNNEL_ACTIVATED_AT_KEY,
  ATTRIBUTION_INHERIT_MS,
  type AvailabilityOutcome,
  type DeviceClass,
  type FunnelEventType,
  type FunnelProgram,
  JOURNEY_COOKIE,
  JOURNEY_MAX_AGE_SECONDS,
  ageBandForAvailability,
  bookingFailureCategory,
  calendarDaysBetween,
  deviceClassFromUserAgent,
  funnelDedupeKey,
  isJourneyId,
  publicFunnelRoute,
  timeBucket,
} from '../../shared/utils/acquisition-funnel'
import { denverYmd, utcNowMs, weekdayFromYmd } from '../../shared/utils/time'
import { loadActivePublicTracking, resolveCampaignAttribution } from './campaigns'

export interface StoredFunnelAttribution {
  campaignId: number | null
  campaignTrackingLinkId: number | null
  trackingCode: string | null
  utmSource: string | null
  utmMedium: string | null
  utmContent: string | null
  utmTerm: string | null
}

const EMPTY_ATTRIBUTION: StoredFunnelAttribution = {
  campaignId: null,
  campaignTrackingLinkId: null,
  trackingCode: null,
  utmSource: null,
  utmMedium: null,
  utmContent: null,
  utmTerm: null,
}

function clip(value: string | null | undefined, max: number): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.slice(0, max)
}

function asQueryString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return asQueryString(value[0])
  }
  return typeof value === 'string' ? value : undefined
}

export function ensureJourneyCookie(event: H3Event): string {
  const existing = getCookie(event, JOURNEY_COOKIE)
  if (isJourneyId(existing)) {
    return existing
  }
  const context = event.context as { acquisitionJourneyId?: string }
  if (isJourneyId(context.acquisitionJourneyId)) {
    return context.acquisitionJourneyId
  }
  const id = randomUUID()
  context.acquisitionJourneyId = id
  try {
    setCookie(event, JOURNEY_COOKIE, id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: JOURNEY_MAX_AGE_SECONDS,
      secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
    })
  } catch {
    // The journey id is still usable for this request.
  }
  return id
}

export async function insertFunnelEvent(db: Database, row: {
  journeyId: string
  eventType: FunnelEventType
  dedupeKey: string
  occurredAt?: Date
  campaignId?: number | null
  campaignTrackingLinkId?: number | null
  trackingCode?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  route?: string | null
  deviceClass?: DeviceClass | null
  metadata?: Record<string, unknown> | null
  leadId?: number | null
}): Promise<void> {
  try {
    const metadata = row.metadata && Object.keys(row.metadata).length
      ? JSON.stringify(row.metadata)
      : null
    if (metadata && metadata.length > 2000) {
      return
    }
    await db.insert(acquisitionFunnelEvents).values({
      journeyId: row.journeyId,
      eventType: row.eventType,
      occurredAt: row.occurredAt ?? new Date(utcNowMs()),
      campaignId: row.campaignId ?? null,
      campaignTrackingLinkId: row.campaignTrackingLinkId ?? null,
      trackingCode: row.trackingCode ?? null,
      utmSource: row.utmSource ?? null,
      utmMedium: row.utmMedium ?? null,
      utmContent: row.utmContent ?? null,
      utmTerm: row.utmTerm ?? null,
      route: row.route ?? null,
      deviceClass: row.deviceClass ?? null,
      metadata,
      leadId: row.leadId ?? null,
      dedupeKey: row.dedupeKey,
    }).onConflictDoNothing({ target: acquisitionFunnelEvents.dedupeKey })
  } catch {
    // Measurement must not block acquisition.
  }
}

async function resolveStoredAttribution(db: Database, input: {
  campaign?: string
  trackingCode?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
}): Promise<StoredFunnelAttribution> {
  try {
    const resolved = await resolveCampaignAttribution(db, {
      campaign: clip(input.campaign, 80),
      trackingCode: clip(input.trackingCode, 32),
      utmSource: clip(input.utmSource, 80),
      utmMedium: clip(input.utmMedium, 80),
      utmContent: clip(input.utmContent, 80),
      utmTerm: clip(input.utmTerm, 80),
    })
    let trackingCode: string | null = null
    if (resolved.campaignTrackingLinkId) {
      const [link] = await db.select({ code: campaignTrackingLinks.code })
        .from(campaignTrackingLinks)
        .where(eq(campaignTrackingLinks.id, resolved.campaignTrackingLinkId))
        .limit(1)
      trackingCode = link?.code ?? null
    }
    return {
      campaignId: resolved.campaignId ?? null,
      campaignTrackingLinkId: resolved.campaignTrackingLinkId ?? null,
      trackingCode,
      utmSource: resolved.utmSource ?? null,
      utmMedium: resolved.utmMedium ?? null,
      utmContent: resolved.utmContent ?? null,
      utmTerm: resolved.utmTerm ?? null,
    }
  } catch {
    return EMPTY_ATTRIBUTION
  }
}

async function inheritRecentAttribution(
  db: Database,
  journeyId: string,
  explicit: StoredFunnelAttribution,
): Promise<StoredFunnelAttribution> {
  if (explicit.campaignId) {
    return explicit
  }
  try {
    const since = new Date(utcNowMs() - ATTRIBUTION_INHERIT_MS)
    const recent = await db.select().from(acquisitionFunnelEvents)
      .where(and(
        eq(acquisitionFunnelEvents.journeyId, journeyId),
        gte(acquisitionFunnelEvents.occurredAt, since),
      ))
      .orderBy(desc(acquisitionFunnelEvents.occurredAt))
      .limit(20)
    const prior = recent.find(row => row.campaignId != null)
    if (!prior?.campaignId) {
      return explicit
    }
    return {
      campaignId: prior.campaignId,
      campaignTrackingLinkId: prior.campaignTrackingLinkId,
      trackingCode: prior.trackingCode,
      utmSource: explicit.utmSource ?? prior.utmSource,
      utmMedium: explicit.utmMedium ?? prior.utmMedium,
      utmContent: explicit.utmContent ?? prior.utmContent,
      utmTerm: explicit.utmTerm ?? prior.utmTerm,
    }
  } catch {
    return explicit
  }
}

function deviceFromEvent(event: H3Event | undefined): DeviceClass {
  if (!event) {
    return 'UNKNOWN'
  }
  return deviceClassFromUserAgent(getRequestHeader(event, 'user-agent'))
}

function normalizeMetadata(eventType: FunnelEventType, metadata: Record<string, unknown>, today: string) {
  if (eventType !== 'class_time_selected') {
    return metadata
  }
  const slotId = typeof metadata.slotId === 'string' ? metadata.slotId : ''
  const startMinute = typeof metadata.startMinute === 'number' ? metadata.startMinute : 0
  const dateMatch = /^rule:\d+:(\d{4}-\d{2}-\d{2})$/.exec(slotId)
  if (!dateMatch?.[1]) {
    return {
      ...metadata,
      timeBucket: timeBucket(startMinute),
    }
  }
  return {
    ...metadata,
    weekday: weekdayFromYmd(dateMatch[1]),
    daysAhead: Math.min(30, Math.max(0, calendarDaysBetween(today, dateMatch[1]))),
    timeBucket: timeBucket(startMinute),
  }
}

async function recordMeasuredEvent(db: Database, input: {
  event?: H3Event
  journeyId?: string
  eventType: FunnelEventType
  metadata?: Record<string, unknown>
  leadId?: number | null
  attribution?: StoredFunnelAttribution
  inherit?: boolean
  route?: string | null
}): Promise<void> {
  try {
    const journeyId = isJourneyId(input.journeyId)
      ? input.journeyId
      : input.event
        ? ensureJourneyCookie(input.event)
        : randomUUID()
    const now = utcNowMs()
    const day = denverYmd(now)
    const explicit = input.attribution ?? EMPTY_ATTRIBUTION
    const attribution = input.inherit === false
      ? explicit
      : await inheritRecentAttribution(db, journeyId, explicit)
    const metadata = normalizeMetadata(input.eventType, input.metadata ?? {}, day)
    await insertFunnelEvent(db, {
      journeyId,
      eventType: input.eventType,
      dedupeKey: funnelDedupeKey({
        eventType: input.eventType,
        journeyId,
        day,
        metadata,
        leadId: input.leadId,
      }),
      occurredAt: new Date(now),
      campaignId: attribution.campaignId,
      campaignTrackingLinkId: attribution.campaignTrackingLinkId,
      trackingCode: attribution.trackingCode,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmContent: attribution.utmContent,
      utmTerm: attribution.utmTerm,
      route: input.route === undefined ? publicFunnelRoute(input.event ? getRequestURL(input.event).pathname : null) : input.route,
      deviceClass: deviceFromEvent(input.event),
      metadata,
      leadId: input.leadId ?? null,
    })
  } catch {
    // Measurement must not block acquisition.
  }
}

export async function recordTrackingLinkReached(db: Database, event: H3Event, rawSlug: string): Promise<void> {
  const loaded = await loadActivePublicTracking(db, rawSlug)
  if (!loaded) {
    return
  }
  const destination = loaded.link.destinationPath || '/trial'
  const safeDestination = destination.startsWith('/') && !destination.startsWith('//')
    ? destination.slice(0, 80)
    : '/trial'
  await recordMeasuredEvent(db, {
    event,
    eventType: 'tracking_link_reached',
    inherit: false,
    route: publicFunnelRoute(`/t/${loaded.slug}`),
    metadata: {
      trackingLinkId: loaded.link.id,
      destination: safeDestination,
    },
    attribution: {
      campaignId: loaded.campaign.id,
      campaignTrackingLinkId: loaded.link.id,
      trackingCode: loaded.link.code,
      utmSource: loaded.link.utmSource,
      utmMedium: loaded.link.utmMedium,
      utmContent: loaded.link.utmContent,
      utmTerm: loaded.link.utmTerm,
    },
  })
}

export async function recordTrialPageView(db: Database, event: H3Event): Promise<void> {
  const query = getQuery(event)
  const attribution = await resolveStoredAttribution(db, {
    campaign: asQueryString(query.campaign),
    trackingCode: asQueryString(query.c),
    utmSource: asQueryString(query.utm_source),
    utmMedium: asQueryString(query.utm_medium),
    utmContent: asQueryString(query.utm_content),
    utmTerm: asQueryString(query.utm_term),
  })
  await recordMeasuredEvent(db, {
    event,
    eventType: 'trial_page_viewed',
    inherit: false,
    route: '/trial',
    attribution,
  })
}

export async function observeAcquisitionRequest(event: H3Event, db: Database): Promise<void> {
  try {
    if (getMethod(event) !== 'GET') {
      return
    }
    const purpose = `${getRequestHeader(event, 'purpose') ?? ''} ${getRequestHeader(event, 'sec-purpose') ?? ''}`.toLowerCase()
    if (purpose.includes('prefetch')) {
      return
    }
    const path = getRequestURL(event).pathname
    if (path === '/trial' || path === '/trial/') {
      await recordTrialPageView(db, event)
      return
    }
    const match = /^\/t\/([^/]+)\/?$/.exec(path)
    if (!match?.[1]) {
      return
    }
    let slug = match[1]
    try {
      slug = decodeURIComponent(slug)
    } catch {
      return
    }
    await recordTrackingLinkReached(db, event, slug)
  } catch {
    // A failed measurement must not stop the redirect or the page.
  }
}

export async function notePublicAvailability(
  db: Database,
  event: H3Event,
  input: {
    program: FunnelProgram
    age?: number | null
    outcome: AvailabilityOutcome
    resultCount: number
  },
): Promise<void> {
  const resultCount = input.outcome === 'ERROR'
    ? 0
    : Math.max(0, Math.min(500, Math.trunc(input.resultCount)))
  await recordMeasuredEvent(db, {
    event,
    eventType: 'availability_result',
    route: '/trial',
    metadata: {
      program: input.program,
      ageBand: ageBandForAvailability(input.program, input.age),
      outcome: input.outcome,
      resultCount,
    },
  })
}

export async function recordPublicAcquisitionEvent(db: Database, event: H3Event, raw: unknown): Promise<'recorded' | 'rejected'> {
  const parsed = publicAcquisitionEventSchema.safeParse(raw)
  if (!parsed.success) {
    return 'rejected'
  }
  const body: PublicAcquisitionEvent = parsed.data
  const attribution = await resolveStoredAttribution(db, {
    campaign: body.campaign,
    trackingCode: body.trackingCode,
    utmSource: body.utmSource,
    utmMedium: body.utmMedium,
    utmContent: body.utmContent,
    utmTerm: body.utmTerm,
  })
  const metadata = body.metadata ? { ...body.metadata } : {}
  await recordMeasuredEvent(db, {
    event,
    eventType: body.type,
    route: publicFunnelRoute(body.route) ?? '/trial',
    metadata,
    attribution,
  })
  return 'recorded'
}

export async function safeRecordBookingFailed(
  db: Database,
  event: H3Event | undefined,
  input: {
    status?: number
    message?: string
    idempotencyKey?: string
    attribution?: StoredFunnelAttribution
  },
): Promise<void> {
  const metadata: Record<string, unknown> = {
    category: bookingFailureCategory({ status: input.status, message: input.message }),
  }
  if (input.idempotencyKey && /^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) {
    metadata.idempotencyKey = input.idempotencyKey
  }
  await recordMeasuredEvent(db, {
    event,
    eventType: 'booking_failed',
    route: '/trial',
    metadata,
    attribution: input.attribution ?? EMPTY_ATTRIBUTION,
  })
}

export async function safeRecordTrialScheduled(
  db: Database,
  event: H3Event | undefined,
  input: { leadId: number, journeyId?: string, attribution?: StoredFunnelAttribution },
): Promise<void> {
  await recordMeasuredEvent(db, {
    event,
    journeyId: input.journeyId,
    eventType: 'trial_scheduled',
    route: '/trial',
    leadId: input.leadId,
    metadata: {},
    attribution: input.attribution ?? EMPTY_ATTRIBUTION,
  })
  try {
    const journeyId = isJourneyId(input.journeyId)
      ? input.journeyId
      : event
        ? getCookie(event, JOURNEY_COOKIE)
        : undefined
    if (!isJourneyId(journeyId)) {
      return
    }
    await db.update(acquisitionFunnelEvents)
      .set({ leadId: input.leadId })
      .where(and(
        eq(acquisitionFunnelEvents.journeyId, journeyId),
        isNull(acquisitionFunnelEvents.leadId),
      ))
  } catch {
    // The booking is already committed.
  }
}

export function attributionInputFromUnknown(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const body = raw as Record<string, unknown>
  return {
    campaign: typeof body.campaign === 'string' ? body.campaign : undefined,
    trackingCode: typeof body.trackingCode === 'string' ? body.trackingCode : undefined,
    utmSource: typeof body.utmSource === 'string' ? body.utmSource : undefined,
    utmMedium: typeof body.utmMedium === 'string' ? body.utmMedium : undefined,
    utmContent: typeof body.utmContent === 'string' ? body.utmContent : undefined,
    utmTerm: typeof body.utmTerm === 'string' ? body.utmTerm : undefined,
  }
}

export function idempotencyFromUnknown(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const value = (raw as { idempotencyKey?: unknown }).idempotencyKey
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined
}

export async function readFunnelActivatedAt(db: Database): Promise<number | null> {
  try {
    const [row] = await db.select().from(appSettings)
      .where(eq(appSettings.key, ACQUISITION_FUNNEL_ACTIVATED_AT_KEY))
      .limit(1)
    if (!row) {
      return null
    }
    const ms = Number(row.value)
    return Number.isFinite(ms) && ms > 0 ? ms : null
  } catch {
    return null
  }
}

export async function resolveBookingAttribution(db: Database, raw: unknown): Promise<StoredFunnelAttribution> {
  return resolveStoredAttribution(db, attributionInputFromUnknown(raw))
}
