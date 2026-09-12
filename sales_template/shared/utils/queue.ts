const DEFAULT_TIMEZONE = 'America/Denver'

export function localDateKey(ms: number, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

export type ActivityQueueBucket = 'overdue' | 'due_today' | 'upcoming' | 'open' | 'completed' | 'cancelled'

export function activityQueueBucket(input: {
  status: string
  dueAt: Date | number | null
  nowMs: number
  timeZone?: string
}): ActivityQueueBucket {
  if (input.status === 'completed') {
    return 'completed'
  }
  if (input.status === 'cancelled') {
    return 'cancelled'
  }
  if (!input.dueAt) {
    return 'upcoming'
  }
  const dueMs = input.dueAt instanceof Date ? input.dueAt.getTime() : input.dueAt
  const tz = input.timeZone ?? DEFAULT_TIMEZONE
  const dueKey = localDateKey(dueMs, tz)
  const todayKey = localDateKey(input.nowMs, tz)
  if (dueKey < todayKey) {
    return 'overdue'
  }
  if (dueKey === todayKey) {
    return 'due_today'
  }
  return 'upcoming'
}
