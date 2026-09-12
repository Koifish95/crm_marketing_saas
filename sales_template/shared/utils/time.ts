export const BUSINESS_TIMEZONE = 'America/Denver'

/** UTC epoch milliseconds. Persist this; do not store local wall time. */
export function utcNowMs(): number {
  return Date.now()
}

function denverFormatParts(utcMs: number) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
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

export function denverYmd(utcMs: number): string {
  const parts = denverFormatParts(utcMs)
  const year = part(parts, 'year')
  const month = part(parts, 'month')
  const day = part(parts, 'day')
  return `${year}-${month}-${day}`
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const next = new Date(Date.UTC(year!, month! - 1, day! + days))
  return next.toISOString().slice(0, 10)
}

/** Inclusive Denver calendar start, exclusive end, as UTC ms. */
export function denverDayStartUtc(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number)
  let low = Date.UTC(year!, month! - 1, day! - 1)
  let high = Date.UTC(year!, month! - 1, day! + 2)
  for (let i = 0; i < 48; i += 1) {
    const mid = Math.floor((low + high) / 2)
    if (denverYmd(mid) < ymd) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return high
}

export function denverRangeUtc(startYmd: string, endYmdInclusive: string) {
  return {
    startMs: denverDayStartUtc(startYmd),
    endMs: denverDayStartUtc(addCalendarDays(endYmdInclusive, 1)),
  }
}

export function inUtcRange(value: Date | number | null | undefined, startMs: number, endMs: number) {
  if (value == null) {
    return false
  }
  const ms = value instanceof Date ? value.getTime() : value
  return ms >= startMs && ms < endMs
}

export function quarterStartMonth(month: number) {
  return Math.floor((month - 1) / 3) * 3 + 1
}

export function reportingRange(
  preset: string,
  nowMs = utcNowMs(),
  customStartYmd?: string,
  customEndYmd?: string,
) {
  const ymd = denverYmd(nowMs)
  const [year = 1970, month = 1] = ymd.split('-').map(Number)
  const thisMonthStart = `${year}-${String(month).padStart(2, '0')}-01`
  if (preset === 'this_month') {
    const nextMonth = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`
    return denverRangeUtc(thisMonthStart, addCalendarDays(nextMonth, -1))
  }
  if (preset === 'last_month') {
    const lastMonthYear = month === 1 ? year - 1 : year
    const lastMonth = month === 1 ? 12 : month - 1
    const start = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`
    return denverRangeUtc(start, addCalendarDays(thisMonthStart, -1))
  }
  if (preset === 'last_30_days') {
    return denverRangeUtc(addCalendarDays(ymd, -29), ymd)
  }
  if (preset === 'this_quarter') {
    const startMonth = quarterStartMonth(month)
    const start = `${year}-${String(startMonth).padStart(2, '0')}-01`
    const endMonth = startMonth + 2
    const next = endMonth === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(endMonth + 1).padStart(2, '0')}-01`
    return denverRangeUtc(start, addCalendarDays(next, -1))
  }
  if (preset === 'this_year') {
    return denverRangeUtc(`${year}-01-01`, `${year}-12-31`)
  }
  if (preset === 'custom' && customStartYmd && customEndYmd) {
    return denverRangeUtc(customStartYmd, customEndYmd)
  }
  return denverRangeUtc(thisMonthStart, ymd)
}

export function toBusinessDate(utcMs: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'medium',
  }).format(new Date(utcMs))
}
