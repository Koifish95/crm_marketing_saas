import { and, eq, gte, inArray, lt } from 'drizzle-orm'
import type { Database } from '../database'
import {
  acquisitionFunnelEvents,
  campaignTrackingLinks,
  campaigns,
  conversions,
  trials,
} from '../database/schema'
import type { BookingFailureCategory, DeviceClass, FunnelProgram } from '../../shared/utils/acquisition-funnel'
import { addCalendarDays, denverWallToUtc, denverYmd, toBusinessDateTime, utcNowMs } from '../../shared/utils/time'
import { readFunnelActivatedAt } from './acquisition-funnel'
import { DomainError } from './errors'

export interface AcquisitionFunnelReport {
  campaignId: number
  activatedAt: string | null
  activatedAtDisplay: string | null
  rangeClampedToActivation: boolean
  from: string
  to: string
  note: string
  stages: Array<{
    key: string
    label: string
    journeys: number
    rateFromPrevious: number | null
  }>
  availability: { available: number, empty: number, error: number }
  failures: { journeys: number, categories: Array<{ category: BookingFailureCategory, journeys: number }> }
  phoneClicked: number
  directionsClicked: number
  outcomes: {
    source: 'crm'
    note: string
    attended: number
    joined: number
  }
  breakdowns: {
    program: Array<{ key: FunnelProgram, journeys: number }>
    path: Array<{ key: string, journeys: number }>
    device: Array<{ key: DeviceClass, journeys: number }>
    trackingLink: Array<{ id: number, label: string, publicSlug: string, journeys: number }>
    day: Array<{ date: string, pageViews: number, scheduled: number }>
  }
}

type FunnelRow = typeof acquisitionFunnelEvents.$inferSelect

const OUTCOME_NOTE = 'Attended and joined use Trial and conversion records for journeys that scheduled in this range. They are not funnel events.'

function denverDayStart(ymd: string): number {
  try {
    return denverWallToUtc(ymd, 0).getTime()
  } catch {
    throw new DomainError('Use a real calendar date.')
  }
}

function occurredMs(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value
}

function readMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

function rate(current: number, previous: number): number | null {
  if (previous <= 0) {
    return null
  }
  return current / previous
}

function uniqueJourneys(rows: FunnelRow[], match: (row: FunnelRow) => boolean): number {
  return new Set(rows.filter(match).map(row => row.journeyId)).size
}

const STAGE_DEFS: Array<{ key: string, label: string, match: (row: FunnelRow) => boolean }> = [
  { key: 'tracking_link_reached', label: 'Tracking link reached', match: row => row.eventType === 'tracking_link_reached' },
  { key: 'trial_page_viewed', label: 'Trial page viewed', match: row => row.eventType === 'trial_page_viewed' },
  { key: 'booking_started', label: 'Booking started', match: row => row.eventType === 'booking_started' },
  {
    key: 'availability_available',
    label: 'Availability loaded with classes',
    match: row => row.eventType === 'availability_result' && readMetadata(row.metadata).outcome === 'AVAILABLE',
  },
  { key: 'class_time_selected', label: 'Class/time selected', match: row => row.eventType === 'class_time_selected' },
  { key: 'booking_submit_attempted', label: 'Submit attempted', match: row => row.eventType === 'booking_submit_attempted' },
  { key: 'trial_scheduled', label: 'Trial scheduled', match: row => row.eventType === 'trial_scheduled' },
]

function stageCounts(rows: FunnelRow[]): AcquisitionFunnelReport['stages'] {
  const counts = STAGE_DEFS.map(stage => uniqueJourneys(rows, stage.match))
  return STAGE_DEFS.map((stage, index) => ({
    key: stage.key,
    label: stage.label,
    journeys: counts[index] ?? 0,
    rateFromPrevious: index === 0 ? null : rate(counts[index] ?? 0, counts[index - 1] ?? 0),
  }))
}

function emptyOutcomes(): AcquisitionFunnelReport['outcomes'] {
  return { source: 'crm', note: OUTCOME_NOTE, attended: 0, joined: 0 }
}

function emptyReport(input: {
  campaignId: number
  activatedMs: number | null
  rangeClampedToActivation: boolean
  from: string
  to: string
  note: string
}): AcquisitionFunnelReport {
  return {
    campaignId: input.campaignId,
    activatedAt: input.activatedMs == null ? null : new Date(input.activatedMs).toISOString(),
    activatedAtDisplay: input.activatedMs == null ? null : toBusinessDateTime(input.activatedMs),
    rangeClampedToActivation: input.rangeClampedToActivation,
    from: input.from,
    to: input.to,
    note: input.note,
    stages: stageCounts([]),
    availability: { available: 0, empty: 0, error: 0 },
    failures: { journeys: 0, categories: [] },
    phoneClicked: 0,
    directionsClicked: 0,
    outcomes: emptyOutcomes(),
    breakdowns: { program: [], path: [], device: [], trackingLink: [], day: [] },
  }
}

export async function getCampaignAcquisitionFunnel(
  db: Database,
  campaignId: number,
  range: { from?: string, to?: string },
): Promise<AcquisitionFunnelReport> {
  const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1)
  if (!campaign) {
    throw new DomainError('Campaign not found.', 404)
  }
  const activatedMs = await readFunnelActivatedAt(db)
  const today = denverYmd(utcNowMs())
  if (range.from && range.to && range.from > range.to) {
    throw new DomainError('The funnel start date must be on or before the end date.')
  }
  let fromMs = range.from ? denverDayStart(range.from) : (activatedMs ?? 0)
  const toYmd = range.to ?? today
  const toMs = denverDayStart(addCalendarDays(toYmd, 1))
  let rangeClampedToActivation = false
  if (activatedMs != null && fromMs < activatedMs) {
    fromMs = activatedMs
    rangeClampedToActivation = Boolean(range.from)
  }
  const note = activatedMs == null
    ? 'Funnel analytics is not activated on this database. Earlier clicks and CRM leads were not backfilled.'
    : `Unique journeys recorded after ${toBusinessDateTime(activatedMs)} America/Denver. Link clicks and CRM leads from before that are not in these stages. Narrowing the dates can make a later stage larger than the one above it.`
  const shell = emptyReport({
    campaignId,
    activatedMs,
    rangeClampedToActivation,
    from: denverYmd(fromMs),
    to: toYmd,
    note,
  })
  if (toMs <= fromMs) {
    return shell
  }

  const attributed = await db.select({ journeyId: acquisitionFunnelEvents.journeyId })
    .from(acquisitionFunnelEvents)
    .where(and(
      eq(acquisitionFunnelEvents.campaignId, campaignId),
      gte(acquisitionFunnelEvents.occurredAt, new Date(fromMs)),
      lt(acquisitionFunnelEvents.occurredAt, new Date(toMs)),
    ))
  const journeyIds = [...new Set(attributed.map(row => row.journeyId))]
  if (!journeyIds.length) {
    return shell
  }

  const rows: FunnelRow[] = []
  for (let index = 0; index < journeyIds.length; index += 400) {
    const chunk = journeyIds.slice(index, index + 400)
    rows.push(...await db.select().from(acquisitionFunnelEvents).where(and(
      inArray(acquisitionFunnelEvents.journeyId, chunk),
      gte(acquisitionFunnelEvents.occurredAt, new Date(fromMs)),
      lt(acquisitionFunnelEvents.occurredAt, new Date(toMs)),
    )))
  }

  const failureCategories = (['VALIDATION', 'SLOT_UNAVAILABLE', 'RATE_LIMITED', 'SERVER', 'NETWORK', 'UNKNOWN'] as const)
    .map(category => ({
      category,
      journeys: uniqueJourneys(rows, row => row.eventType === 'booking_failed' && readMetadata(row.metadata).category === category),
    }))
    .filter(row => row.journeys > 0)
  const scheduledLeadIds = [...new Set(rows
    .filter(row => row.eventType === 'trial_scheduled' && row.leadId != null)
    .map(row => row.leadId as number))]

  return {
    ...shell,
    stages: stageCounts(rows),
    availability: {
      available: uniqueJourneys(rows, row => row.eventType === 'availability_result' && readMetadata(row.metadata).outcome === 'AVAILABLE'),
      empty: uniqueJourneys(rows, row => row.eventType === 'availability_result' && readMetadata(row.metadata).outcome === 'EMPTY'),
      error: uniqueJourneys(rows, row => row.eventType === 'availability_result' && readMetadata(row.metadata).outcome === 'ERROR'),
    },
    failures: {
      journeys: uniqueJourneys(rows, row => row.eventType === 'booking_failed'),
      categories: failureCategories,
    },
    phoneClicked: uniqueJourneys(rows, row => row.eventType === 'phone_clicked'),
    directionsClicked: uniqueJourneys(rows, row => row.eventType === 'directions_clicked'),
    outcomes: await crmOutcomes(db, scheduledLeadIds),
    breakdowns: {
      program: programBreakdown(rows),
      path: pathBreakdown(rows),
      device: deviceBreakdown(rows),
      trackingLink: await linkBreakdown(db, campaignId, rows),
      day: dayBreakdown(rows),
    },
  }
}

function programBreakdown(rows: FunnelRow[]): AcquisitionFunnelReport['breakdowns']['program'] {
  return (['ADULT_BJJ', 'KIDS_BJJ'] as const).flatMap((program) => {
    const journeys = uniqueJourneys(rows, row => row.eventType === 'program_selected' && readMetadata(row.metadata).program === program)
    return journeys > 0 ? [{ key: program, journeys }] : []
  })
}

function pathBreakdown(rows: FunnelRow[]): AcquisitionFunnelReport['breakdowns']['path'] {
  const latest = new Map<string, { path: string, at: number, id: number }>()
  for (const row of rows) {
    if (row.eventType !== 'participant_path_selected') {
      continue
    }
    const path = readMetadata(row.metadata).path
    if (path !== 'SELF' && path !== 'CHILD' && path !== 'FAMILY') {
      continue
    }
    const at = occurredMs(row.occurredAt)
    const current = latest.get(row.journeyId)
    if (!current || at > current.at || (at === current.at && row.id >= current.id)) {
      latest.set(row.journeyId, { path, at, id: row.id })
    }
  }
  return (['SELF', 'CHILD', 'FAMILY'] as const).flatMap((path) => {
    const journeys = [...latest.values()].filter(row => row.path === path).length
    return journeys > 0 ? [{ key: path, journeys }] : []
  })
}

function deviceBreakdown(rows: FunnelRow[]): AcquisitionFunnelReport['breakdowns']['device'] {
  const earliest = new Map<string, { device: string, at: number }>()
  for (const row of rows) {
    const at = occurredMs(row.occurredAt)
    const current = earliest.get(row.journeyId)
    if (!current || at < current.at) {
      earliest.set(row.journeyId, { device: row.deviceClass || 'UNKNOWN', at })
    }
  }
  return (['MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN'] as const).flatMap((device) => {
    const journeys = [...earliest.values()].filter(row => row.device === device).length
    return journeys > 0 ? [{ key: device, journeys }] : []
  })
}

async function linkBreakdown(db: Database, campaignId: number, rows: FunnelRow[]) {
  const links = await db.select({
    id: campaignTrackingLinks.id,
    label: campaignTrackingLinks.label,
    publicSlug: campaignTrackingLinks.publicSlug,
  }).from(campaignTrackingLinks).where(eq(campaignTrackingLinks.campaignId, campaignId))
  const chosen = new Map<string, { id: number, at: number, preferred: boolean }>()
  for (const row of rows) {
    if (row.campaignTrackingLinkId == null) {
      continue
    }
    const preferred = row.eventType === 'tracking_link_reached'
    const at = occurredMs(row.occurredAt)
    const current = chosen.get(row.journeyId)
    if (!current || (preferred && !current.preferred) || (preferred === current.preferred && at < current.at)) {
      chosen.set(row.journeyId, { id: row.campaignTrackingLinkId, at, preferred })
    }
  }
  return links.flatMap((link) => {
    const journeys = [...chosen.values()].filter(row => row.id === link.id).length
    return journeys > 0 ? [{ id: link.id, label: link.label, publicSlug: link.publicSlug, journeys }] : []
  })
}

function dayBreakdown(rows: FunnelRow[]): AcquisitionFunnelReport['breakdowns']['day'] {
  const days = new Map<string, { views: Set<string>, scheduled: Set<string> }>()
  for (const row of rows) {
    if (row.eventType !== 'trial_page_viewed' && row.eventType !== 'trial_scheduled') {
      continue
    }
    const date = denverYmd(occurredMs(row.occurredAt))
    const bucket = days.get(date) ?? { views: new Set<string>(), scheduled: new Set<string>() }
    if (row.eventType === 'trial_page_viewed') {
      bucket.views.add(row.journeyId)
    } else {
      bucket.scheduled.add(row.journeyId)
    }
    days.set(date, bucket)
  }
  return [...days.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, bucket]) => ({
      date,
      pageViews: bucket.views.size,
      scheduled: bucket.scheduled.size,
    }))
}

async function crmOutcomes(db: Database, leadIds: number[]): Promise<AcquisitionFunnelReport['outcomes']> {
  if (!leadIds.length) {
    return emptyOutcomes()
  }
  const attended = new Set<number>()
  const joined = new Set<number>()
  for (let index = 0; index < leadIds.length; index += 400) {
    const chunk = leadIds.slice(index, index + 400)
    const trialRows = await db.select({ leadId: trials.leadId, status: trials.status })
      .from(trials)
      .where(inArray(trials.leadId, chunk))
    for (const row of trialRows) {
      if (row.status === 'ATTENDED') {
        attended.add(row.leadId)
      }
    }
    const conversionRows = await db.select({ leadId: conversions.leadId, reversedAt: conversions.reversedAt })
      .from(conversions)
      .where(inArray(conversions.leadId, chunk))
    for (const row of conversionRows) {
      if (!row.reversedAt) {
        joined.add(row.leadId)
      }
    }
  }
  return { source: 'crm', note: OUTCOME_NOTE, attended: attended.size, joined: joined.size }
}
