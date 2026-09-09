import type { FollowUpCallOutcome } from '../schemas/enums'
import { addCalendarDays, BUSINESS_TIMEZONE, denverWallToUtc, denverYmd, weekdayFromYmd } from './time'

/** Business days after a Trial is scheduled before the confirmation call is due. */
export const FOLLOW_UP_BUSINESS_DAY_DELAY = 2

/** End-of-business-day due time: 5:00 PM America/Denver, as minutes from midnight. */
export const FOLLOW_UP_DUE_MINUTE = 17 * 60

export const FOLLOW_UP_TIMEZONE = BUSINESS_TIMEZONE

export const FOLLOW_UP_CALL_OUTCOME_LABELS: Record<FollowUpCallOutcome, string> = {
  REACHED: 'Reached',
  NO_ANSWER: 'No answer',
  LEFT_VOICEMAIL: 'Left voicemail',
  WRONG_NUMBER: 'Wrong number',
  OTHER: 'Other',
}

export type FollowUpDueState = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING'

/** Queue/dashboard time buckets for PENDING tasks. Not stored statuses. */
export type FollowUpTimeView = 'overdue' | 'due_today' | 'upcoming'

/**
 * Classify a PENDING task's due timestamp.
 * Overdue: dueAt < now.
 * Due today: dueAt >= now and the Denver calendar date is today.
 * Upcoming: Denver calendar date is after today.
 */
export function followUpDueState(dueAtMs: number, nowMs: number): FollowUpDueState {
  if (dueAtMs < nowMs) {
    return 'OVERDUE'
  }
  if (denverYmd(dueAtMs) === denverYmd(nowMs)) {
    return 'DUE_TODAY'
  }
  return 'UPCOMING'
}

export function followUpTimeViewState(view: FollowUpTimeView): FollowUpDueState {
  if (view === 'overdue') {
    return 'OVERDUE'
  }
  if (view === 'due_today') {
    return 'DUE_TODAY'
  }
  return 'UPCOMING'
}

export function matchesFollowUpTimeView(
  dueState: FollowUpDueState | null | undefined,
  view: FollowUpTimeView,
): boolean {
  return dueState === followUpTimeViewState(view)
}

export function dueStateRank(state: FollowUpDueState): number {
  if (state === 'OVERDUE') {
    return 0
  }
  if (state === 'DUE_TODAY') {
    return 1
  }
  return 2
}

const WEEKEND = new Set([0, 6])

export function addBusinessDays(ymd: string, days: number): string {
  let remaining = days
  let current = ymd
  while (remaining > 0) {
    current = addCalendarDays(current, 1)
    if (!WEEKEND.has(weekdayFromYmd(current))) {
      remaining -= 1
    }
  }
  return current
}

/** UTC instant for the default follow-up deadline after a scheduling operation. */
export function followUpDueAt(scheduledAtMs: number): Date {
  const startYmd = denverYmd(scheduledAtMs)
  const dueYmd = addBusinessDays(startYmd, FOLLOW_UP_BUSINESS_DAY_DELAY)
  return denverWallToUtc(dueYmd, FOLLOW_UP_DUE_MINUTE)
}
