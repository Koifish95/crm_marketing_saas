export const BUSINESS_TIMEZONE = 'America/Denver'

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** UTC epoch milliseconds. Persist this; do not store local wall time. */
export function utcNowMs(): number {
  return Date.now()
}

export function toBusinessDateTime(utcMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(utcMs))
}

export function toBusinessDate(utcMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'medium',
  }).format(new Date(utcMs))
}

export function businessYearMonth(utcMs: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).format(new Date(utcMs)).slice(0, 7)
}

export function isInCurrentBusinessMonth(utcMs: number, nowMs = utcNowMs()): boolean {
  return businessYearMonth(utcMs) === businessYearMonth(nowMs)
}

function denverFormatParts(utcMs: number) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs))
}

function part(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find(item => item.type === type)?.value ?? ''
}

export interface DenverParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
  ymd: string
  minuteOfDay: number
}

export function denverParts(utcMs: number): DenverParts {
  const parts = denverFormatParts(utcMs)
  const year = Number(part(parts, 'year'))
  const month = Number(part(parts, 'month'))
  const day = Number(part(parts, 'day'))
  const hour = Number(part(parts, 'hour'))
  const minute = Number(part(parts, 'minute'))
  const weekday = WEEKDAY_SHORT[part(parts, 'weekday')] ?? 0
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    ymd,
    minuteOfDay: hour * 60 + minute,
  }
}

export function denverYmd(utcMs: number): string {
  return denverParts(utcMs).ymd
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const next = new Date(Date.UTC(year!, month! - 1, day! + days))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

export function listCalendarDates(startYmd: string, dayCount: number): string[] {
  return Array.from({ length: dayCount }, (_, index) => addCalendarDays(startYmd, index))
}

export function weekdayFromYmd(ymd: string): number {
  return denverParts(denverWallToUtc(ymd, 12 * 60).getTime()).weekday
}

/** Convert America/Denver civil date + minutes-from-midnight to a UTC Date. */
export function denverWallToUtc(ymd: string, minuteOfDay: number): Date {
  const [year, month, day] = ymd.split('-').map(Number)
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  let guess = Date.UTC(year!, month! - 1, day!, hour + 7, minute, 0)

  for (let attempt = 0; attempt < 48; attempt++) {
    const current = denverParts(guess)
    if (current.ymd === ymd && current.minuteOfDay === minuteOfDay) {
      return new Date(guess)
    }

    const currentUtcNoon = Date.UTC(current.year, current.month - 1, current.day, 12)
    const targetUtcNoon = Date.UTC(year!, month! - 1, day!, 12)
    if (current.ymd !== ymd) {
      guess += targetUtcNoon - currentUtcNoon
      continue
    }

    guess += (minuteOfDay - current.minuteOfDay) * 60_000
  }

  throw new Error(`Could not convert ${ymd} ${minuteOfDay} in ${BUSINESS_TIMEZONE}.`)
}

export function formatMinuteOfDay(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

/** `HH:mm` for `<input type="time">`. */
export function minuteOfDayToClock(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function clockToMinuteOfDay(value: string | null | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) {
    return undefined
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) {
    return undefined
  }
  return hour * 60 + minute
}

export function formatDenverLongDate(ymd: string): string {
  const utc = denverWallToUtc(ymd, 12 * 60)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(utc)
}

export function formatDenverChipDate(ymd: string): string {
  const utc = denverWallToUtc(ymd, 12 * 60)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(utc)
}

export function formatDenverCardDate(utcMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(new Date(utcMs))
}

export function formatDenverCardTime(utcMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(utcMs))
}

/** `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">` in America/Denver. */
export function toDatetimeLocalValue(utcMs: number): string {
  const parts = denverParts(utcMs)
  return `${parts.ymd}T${minuteOfDayToClock(parts.minuteOfDay)}`
}

export function datetimeLocalFromUnknown(value?: string | Date | null): string {
  if (value == null || value === '') {
    return ''
  }
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) {
    return ''
  }
  return toDatetimeLocalValue(ms)
}

export function datetimeLocalValueToIso(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(trimmed)
  if (!match) {
    return null
  }
  const hour = Number(match[2])
  const minute = Number(match[3])
  return denverWallToUtc(match[1]!, hour * 60 + minute).toISOString()
}
