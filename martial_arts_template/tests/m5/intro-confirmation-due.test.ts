import { describe, expect, it } from 'vitest'
import { introConfirmationDueAt } from '../../shared/utils/follow-up'

// Every expectation is a hand-computed literal. Rule: the last business day (Mon-Fri)
// before the intro, at 5:00 PM America/Denver (23:00Z during MDT, 00:00Z next day during MST).
// If that moment has passed, 5:00 PM Denver today. The function has no holiday handling.

function due(trialIso: string, nowIso: string): string {
  return introConfirmationDueAt(Date.parse(trialIso), Date.parse(nowIso)).toISOString()
}

describe('introConfirmationDueAt pinned timestamps', () => {
  it('uses the previous day 5pm for a mid-week intro with plenty of notice', () => {
    // Intro Wed 2026-09-09 12:00 MDT, now Fri 2026-09-04 10:00 MDT -> Tue 2026-09-08 5pm MDT
    expect(due('2026-09-09T18:00:00.000Z', '2026-09-04T16:00:00.000Z')).toBe('2026-09-08T23:00:00.000Z')
  })

  it('uses the previous Friday for a Monday intro', () => {
    // Intro Mon 2026-09-14 10:00 MDT, now Wed 2026-09-09 -> Fri 2026-09-11 5pm MDT
    expect(due('2026-09-14T16:00:00.000Z', '2026-09-09T16:00:00.000Z')).toBe('2026-09-11T23:00:00.000Z')
  })

  it('uses the same day 5pm for an intro early the next morning', () => {
    // Intro Tue 2026-09-15 08:00 MDT, now Mon 2026-09-14 15:00 MDT -> Mon 5pm MDT
    expect(due('2026-09-15T14:00:00.000Z', '2026-09-14T21:00:00.000Z')).toBe('2026-09-14T23:00:00.000Z')
  })

  it('falls back to 5pm today when the deadline has passed', () => {
    // Intro Mon 2026-09-14 18:00 MDT, now Mon 09:00 MDT; Friday 5pm is long gone -> Mon 5pm MDT
    expect(due('2026-09-15T00:00:00.000Z', '2026-09-14T15:00:00.000Z')).toBe('2026-09-14T23:00:00.000Z')
  })

  it('falls back to 5pm today on a weekend when the Friday deadline has passed', () => {
    // Intro Mon 2026-09-14 10:00 MDT, now Sat 2026-09-12 10:00 MDT -> Sat 5pm MDT
    expect(due('2026-09-14T16:00:00.000Z', '2026-09-12T16:00:00.000Z')).toBe('2026-09-12T23:00:00.000Z')
  })

  it('does not skip Labor Day (the function has no holiday logic)', () => {
    // Intro Tue 2026-09-08 10:00 MDT -> Mon 2026-09-07 (Labor Day) 5pm MDT
    expect(due('2026-09-08T16:00:00.000Z', '2026-09-01T16:00:00.000Z')).toBe('2026-09-07T23:00:00.000Z')
  })

  describe('daylight saving', () => {
    it('spring forward 2026-03-08: Monday intro gets Friday 5pm MST (00:00Z)', () => {
      // Intro Mon 2026-03-09 10:00 MDT, now Wed 2026-03-04 -> Fri 2026-03-06 5pm MST
      expect(due('2026-03-09T16:00:00.000Z', '2026-03-04T17:00:00.000Z')).toBe('2026-03-07T00:00:00.000Z')
    })

    it('spring forward 2026-03-08: Tuesday intro gets Monday 5pm MDT (23:00Z)', () => {
      expect(due('2026-03-10T16:00:00.000Z', '2026-03-04T17:00:00.000Z')).toBe('2026-03-09T23:00:00.000Z')
    })

    it('fall back 2026-11-01: Monday intro gets Friday 5pm MDT (23:00Z)', () => {
      // Intro Mon 2026-11-02 10:00 MST, now Wed 2026-10-28 -> Fri 2026-10-30 5pm MDT
      expect(due('2026-11-02T17:00:00.000Z', '2026-10-28T17:00:00.000Z')).toBe('2026-10-30T23:00:00.000Z')
    })

    it('fall back 2026-11-01: Tuesday intro gets Monday 5pm MST (00:00Z next day)', () => {
      expect(due('2026-11-03T17:00:00.000Z', '2026-10-28T17:00:00.000Z')).toBe('2026-11-03T00:00:00.000Z')
    })
  })
})
