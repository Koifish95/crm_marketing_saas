/** First-party public acquisition funnel. Observes the current booking path. */

export const JOURNEY_COOKIE = 'acquisition_journey'
export const JOURNEY_MAX_AGE_SECONDS = 14 * 24 * 60 * 60
export const ATTRIBUTION_INHERIT_MS = 6 * 60 * 60 * 1000
export const ACQUISITION_FUNNEL_ACTIVATED_AT_KEY = 'acquisition_funnel_activated_at'
export const SUBMIT_TAP_DEDUPE_MS = 1500

export const FUNNEL_EVENT_TYPES = [
  'tracking_link_reached',
  'trial_page_viewed',
  'booking_started',
  'participant_path_selected',
  'program_selected',
  'availability_result',
  'class_time_selected',
  'contact_step_reached',
  'booking_submit_attempted',
  'booking_failed',
  'trial_scheduled',
  'phone_clicked',
  'directions_clicked',
] as const

export type FunnelEventType = (typeof FUNNEL_EVENT_TYPES)[number]

export const PUBLIC_FUNNEL_EVENT_TYPES = [
  'trial_page_viewed',
  'booking_started',
  'participant_path_selected',
  'program_selected',
  'availability_result',
  'class_time_selected',
  'contact_step_reached',
  'booking_submit_attempted',
  'booking_failed',
  'phone_clicked',
  'directions_clicked',
] as const

export type PublicFunnelEventType = (typeof PUBLIC_FUNNEL_EVENT_TYPES)[number]

export const PARTICIPANT_PATHS = ['SELF', 'CHILD', 'FAMILY'] as const
export type ParticipantPath = (typeof PARTICIPANT_PATHS)[number]

/** Public booking program codes. Same pair the intro form already offers. */
export const FUNNEL_PROGRAMS = ['ADULT_BJJ', 'KIDS_BJJ'] as const
export type FunnelProgram = (typeof FUNNEL_PROGRAMS)[number]

export const AGE_BANDS = ['ADULT', '4-6', '7-9', '10-12', '13-16', 'UNSPECIFIED'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export const AVAILABILITY_OUTCOMES = ['AVAILABLE', 'EMPTY', 'ERROR'] as const
export type AvailabilityOutcome = (typeof AVAILABILITY_OUTCOMES)[number]

export const TIME_BUCKETS = ['MORNING', 'AFTERNOON', 'EVENING'] as const
export type TimeBucket = (typeof TIME_BUCKETS)[number]

export const DEVICE_CLASSES = ['MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN'] as const
export type DeviceClass = (typeof DEVICE_CLASSES)[number]

export const BOOKING_FAILURE_CATEGORIES = [
  'VALIDATION',
  'SLOT_UNAVAILABLE',
  'RATE_LIMITED',
  'SERVER',
  'NETWORK',
  'UNKNOWN',
] as const
export type BookingFailureCategory = (typeof BOOKING_FAILURE_CATEGORIES)[number]

const JOURNEY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SLOT_ID = /^(?:rule:\d+:\d{4}-\d{2}-\d{2}|exception:\d+)$/

export function isJourneyId(value: string | undefined | null): value is string {
  return typeof value === 'string' && JOURNEY_ID.test(value)
}

export function isFunnelSlotId(value: string | undefined | null): value is string {
  return typeof value === 'string' && SLOT_ID.test(value)
}

/** Coarse class from a user-agent string. The string itself is not stored. */
export function deviceClassFromUserAgent(userAgent: string | undefined | null): DeviceClass {
  const ua = userAgent?.trim()
  if (!ua) {
    return 'UNKNOWN'
  }
  const value = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/.test(value)) {
    return 'TABLET'
  }
  if (/mobi|iphone|ipod|android|phone/.test(value)) {
    return 'MOBILE'
  }
  return 'DESKTOP'
}

export function ageBandForAvailability(program: FunnelProgram, age?: number | null): AgeBand {
  if (program === 'ADULT_BJJ') {
    return 'ADULT'
  }
  if (age == null || !Number.isInteger(age) || age < 4 || age > 16) {
    return 'UNSPECIFIED'
  }
  if (age <= 6) {
    return '4-6'
  }
  if (age <= 9) {
    return '7-9'
  }
  if (age <= 12) {
    return '10-12'
  }
  return '13-16'
}

export function timeBucket(startMinute: number): TimeBucket {
  if (startMinute < 12 * 60) {
    return 'MORNING'
  }
  if (startMinute < 17 * 60) {
    return 'AFTERNOON'
  }
  return 'EVENING'
}

export function calendarDaysBetween(fromYmd: string, toYmd: string): number {
  const from = ymdToUtc(fromYmd)
  const to = ymdToUtc(toYmd)
  if (from == null || to == null) {
    return 0
  }
  return Math.round((to - from) / 86_400_000)
}

function ymdToUtc(ymd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) {
    return null
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function classTimeSelection(input: {
  slotId: string
  program: FunnelProgram
  startMinute: number
  todayYmd: string
  weekday: number
}): {
  slotId: string
  program: FunnelProgram
  weekday: number
  timeBucket: TimeBucket
  startMinute: number
  daysAhead: number
} | null {
  if (!isFunnelSlotId(input.slotId)) {
    return null
  }
  if (!Number.isInteger(input.startMinute) || input.startMinute < 0 || input.startMinute > 1439) {
    return null
  }
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
    return null
  }
  const dateMatch = /^rule:\d+:(\d{4}-\d{2}-\d{2})$/.exec(input.slotId)
  const daysAhead = dateMatch
    ? Math.min(30, Math.max(0, calendarDaysBetween(input.todayYmd, dateMatch[1]!)))
    : 0
  return {
    slotId: input.slotId,
    program: input.program,
    weekday: input.weekday,
    timeBucket: timeBucket(input.startMinute),
    startMinute: input.startMinute,
    daysAhead,
  }
}

export function claimClientEvent(sent: Set<string>, key: string): boolean {
  if (sent.has(key)) {
    return false
  }
  sent.add(key)
  return true
}

export function isRepeatedSubmitTap(lastAt: number, now: number, windowMs = SUBMIT_TAP_DEDUPE_MS): boolean {
  return lastAt > 0 && now - lastAt < windowMs
}

export function publicFunnelRoute(value: string | undefined | null): string | null {
  if (!value) {
    return null
  }
  const path = value.split('?')[0]?.trim() ?? ''
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 80) {
    return null
  }
  if (path === '/trial') {
    return path
  }
  if (/^\/t\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) {
    return path
  }
  return null
}

export function bookingFailureCategory(input: { status?: number, message?: string }): BookingFailureCategory {
  const message = (input.message ?? '').toLowerCase()
  if (input.status === 429 || message.includes('too many')) {
    return 'RATE_LIMITED'
  }
  if (message.includes('not available')) {
    return 'SLOT_UNAVAILABLE'
  }
  if (input.status != null && input.status >= 400 && input.status < 500) {
    return 'VALIDATION'
  }
  if (input.status != null && input.status >= 500) {
    return 'SERVER'
  }
  if (input.status == null) {
    return 'NETWORK'
  }
  return 'UNKNOWN'
}

export function funnelDedupeKey(input: {
  eventType: FunnelEventType
  journeyId: string
  day: string
  metadata?: Record<string, unknown>
  leadId?: number | null
}): string {
  const meta = input.metadata ?? {}
  const day = input.day
  const journeyId = input.journeyId
  switch (input.eventType) {
    case 'tracking_link_reached':
      return `tracking_link_reached:${journeyId}:${String(meta.trackingLinkId ?? '')}:${day}`
    case 'trial_page_viewed':
      return `trial_page_viewed:${journeyId}:${day}`
    case 'booking_started':
      return `booking_started:${journeyId}:${day}`
    case 'participant_path_selected':
      return `participant_path_selected:${journeyId}:${String(meta.path ?? '')}:${day}`
    case 'program_selected':
      return `program_selected:${journeyId}:${String(meta.program ?? '')}:${day}`
    case 'availability_result':
      if (meta.outcome === 'ERROR') {
        return `availability_result:${journeyId}:${String(meta.program ?? '')}:${String(meta.ageBand ?? '')}:ERROR:${day}`
      }
      return `availability_result:${journeyId}:${String(meta.program ?? '')}:${String(meta.ageBand ?? '')}:${String(meta.outcome ?? '')}:${String(meta.resultCount ?? '')}:${day}`
    case 'class_time_selected':
      return `class_time_selected:${journeyId}:${String(meta.slotId ?? '')}`
    case 'contact_step_reached':
      return `contact_step_reached:${journeyId}`
    case 'booking_submit_attempted':
      return `booking_submit_attempted:${journeyId}:${String(meta.idempotencyKey ?? '')}`
    case 'booking_failed':
      return `booking_failed:${journeyId}:${String(meta.category ?? '')}:${String(meta.idempotencyKey ?? 'none')}`
    case 'trial_scheduled':
      return `trial_scheduled:${input.leadId ?? ''}`
    case 'phone_clicked':
      return `phone_clicked:${journeyId}:${day}`
    case 'directions_clicked':
      return `directions_clicked:${journeyId}:${day}`
    default:
      return `${input.eventType}:${journeyId}:${day}`
  }
}
