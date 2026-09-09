import { describe, expect, it } from 'vitest'
import { householdDisplayStatus } from '../../shared/utils/labels'
import {
  activeConversion,
  excerptNote,
  forecastCentsForLine,
  householdFollowUpMode,
  householdForecastMode,
  latestRelevantTrial,
  nextScheduledTrial,
  openForecastBreakdownRows,
  summarizeLeadLine,
  type SummaryForecastLine,
  type SummaryLeadLine,
  type SummaryTrial,
} from '../../shared/utils/lead-line-summary'

function trial(partial: Partial<SummaryTrial> & Pick<SummaryTrial, 'id' | 'status' | 'scheduledAt'>): SummaryTrial {
  return { label: null, ...partial }
}

function line(partial: Partial<SummaryLeadLine> & Pick<SummaryLeadLine, 'id' | 'firstName' | 'relationship' | 'status'>): SummaryLeadLine {
  return {
    lastName: 'Coy',
    age: null,
    program: { name: 'Adult BJJ' },
    membershipOffering: null,
    conversions: [],
    lostOutcomes: [],
    trials: [],
    ...partial,
  }
}

const sept1 = '2026-09-01T18:00:00.000Z'
const sept3 = '2026-09-03T18:00:00.000Z'
const sept8 = '2026-09-08T18:00:00.000Z'

describe('LeadLine acquisition summary', () => {
  it('summarizes an open person with no Trial', () => {
    const summary = summarizeLeadLine(line({
      id: 1,
      firstName: 'Josh',
      relationship: 'SELF',
      status: 'NEW',
    }))
    expect(summary.kind).toBe('open')
    expect(summary.statusLabel).toBe('New')
    expect(summary.relationshipLabel).toBe('Self')
    expect(summary.latestTrial).toBeNull()
    expect(summary.nextScheduledTrial).toBeNull()
    expect(summary.conversion).toBeNull()
    expect(summary.lost).toBeNull()
    expect(summary.forecastMonthlyCents).toBeNull()
  })

  it('summarizes an open person with a scheduled Trial', () => {
    const scheduled = trial({ id: 10, status: 'SCHEDULED', scheduledAt: sept8, label: 'Adult Gi' })
    const summary = summarizeLeadLine(line({
      id: 1,
      firstName: 'Josh',
      relationship: 'SELF',
      status: 'TRIAL_SCHEDULED',
      trials: [scheduled],
    }))
    expect(summary.kind).toBe('open')
    expect(summary.latestTrial).toEqual(scheduled)
    expect(summary.nextScheduledTrial).toEqual(scheduled)
    expect(summary.statusLabel).toBe('Trial scheduled')
  })

  it('summarizes a guardian-only child line without inventing SELF', () => {
    const summary = summarizeLeadLine(line({
      id: 2,
      firstName: 'Jaime',
      relationship: 'CHILD',
      status: 'NEW',
      age: 5,
      program: { name: 'Kids BJJ' },
    }))
    expect(summary.relationshipLabel).toBe('Child')
    expect(summary.age).toBe(5)
    expect(summary.programName).toBe('Kids BJJ')
    expect(summary.kind).toBe('open')
  })

  it('keeps two active household members independent', () => {
    const parent = summarizeLeadLine(line({
      id: 1,
      firstName: 'Josh',
      relationship: 'SELF',
      status: 'TRIAL_SCHEDULED',
      program: { name: 'Adult BJJ' },
      trials: [trial({ id: 1, status: 'SCHEDULED', scheduledAt: sept8 })],
    }))
    const child = summarizeLeadLine(line({
      id: 2,
      firstName: 'Jaime',
      relationship: 'CHILD',
      status: 'TRIAL_SCHEDULED',
      age: 5,
      program: { name: 'Kids BJJ' },
      trials: [trial({ id: 2, status: 'SCHEDULED', scheduledAt: sept8 })],
    }))
    expect(parent.kind).toBe('open')
    expect(child.kind).toBe('open')
    expect(parent.programName).toBe('Adult BJJ')
    expect(child.programName).toBe('Kids BJJ')
    expect(parent.status).not.toBe('JOINED')
    expect(child.status).not.toBe('LOST')
  })

  it('selects the current scheduled Trial and ignores cancelled reschedule history', () => {
    const cancelled = trial({ id: 1, status: 'CANCELLED', scheduledAt: sept1, label: 'Old slot' })
    const current = trial({ id: 2, status: 'SCHEDULED', scheduledAt: sept8, label: 'New slot' })
    expect(latestRelevantTrial([cancelled, current])?.id).toBe(2)
    expect(nextScheduledTrial([current, cancelled])?.id).toBe(2)
    const summary = summarizeLeadLine(line({
      id: 1,
      firstName: 'Josh',
      relationship: 'SELF',
      status: 'TRIAL_SCHEDULED',
      trials: [cancelled, current],
    }))
    expect(summary.latestTrial?.id).toBe(2)
    expect(summary.latestTrial?.status).toBe('SCHEDULED')
  })

  it('uses the latest attended Trial when no scheduled intro remains', () => {
    const cancelled = trial({ id: 1, status: 'CANCELLED', scheduledAt: sept3 })
    const attended = trial({ id: 2, status: 'ATTENDED', scheduledAt: sept1 })
    const noShow = trial({ id: 3, status: 'NO_SHOW', scheduledAt: '2026-08-20T18:00:00.000Z' })
    expect(latestRelevantTrial([cancelled, attended, noShow])?.id).toBe(2)
  })

  it('does not treat cancelled-only history as a current Trial', () => {
    expect(latestRelevantTrial([
      trial({ id: 1, status: 'CANCELLED', scheduledAt: sept1 }),
    ])).toBeNull()
  })

  it('shows JOINED outcome from the Conversion snapshot and excludes it from Forecast MRR', () => {
    const forecast: SummaryForecastLine = {
      leadLineId: 1,
      forecastMonthlyCents: 0,
      includedInForecast: false,
    }
    const summary = summarizeLeadLine(line({
      id: 1,
      firstName: 'Josh',
      relationship: 'SELF',
      status: 'JOINED',
      membershipOffering: { name: 'Adult BJJ Membership', monthlyCents: 18500 },
      conversions: [{
        id: 9,
        monthlyCents: 17500,
        enrollmentCents: 0,
        offeringName: 'Adult BJJ Membership',
        joinedAt: sept1,
        reversedAt: null,
      }],
      trials: [trial({ id: 4, status: 'ATTENDED', scheduledAt: sept1 })],
    }), forecast)
    expect(summary.kind).toBe('joined')
    expect(summary.statusLabel).toBe('Joined')
    expect(summary.conversion?.monthlyCents).toBe(17500)
    expect(summary.conversion?.offeringName).toBe('Adult BJJ Membership')
    expect(summary.forecastMonthlyCents).toBeNull()
    expect(forecastCentsForLine({ id: 1, status: 'JOINED' }, {
      leadLineId: 1,
      forecastMonthlyCents: 17500,
      includedInForecast: false,
    })).toBeNull()
    expect(summary.latestTrial?.status).toBe('ATTENDED')
  })

  it('ignores reversed conversions when selecting the active snapshot', () => {
    expect(activeConversion([
      { id: 1, monthlyCents: 17500, enrollmentCents: 0, joinedAt: sept1, reversedAt: sept3 },
      { id: 2, monthlyCents: 15500, enrollmentCents: 0, joinedAt: sept8, reversedAt: null },
    ])?.id).toBe(2)
  })

  it('shows LOST outcome with structured reason and a short note excerpt', () => {
    const longNote = `${'Need evenings. '.repeat(20)}extra`
    const summary = summarizeLeadLine(line({
      id: 2,
      firstName: 'Jaime',
      relationship: 'CHILD',
      status: 'LOST',
      age: 5,
      program: { name: 'Kids BJJ' },
      lostOutcomes: [{
        id: 3,
        createdAt: sept1,
        reopenedAt: null,
        note: longNote,
        lostReason: { id: 8, name: 'Schedule conflict' },
      }],
      trials: [trial({ id: 5, status: 'ATTENDED', scheduledAt: sept1 })],
    }))
    expect(summary.kind).toBe('lost')
    expect(summary.statusLabel).toBe('Lost')
    expect(summary.lost?.reasonName).toBe('Schedule conflict')
    expect(summary.lost?.noteExcerpt).toBe(excerptNote(longNote))
    expect(summary.lost?.noteExcerpt?.endsWith('…')).toBe(true)
    expect(summary.lost?.noteExcerpt?.length).toBeLessThanOrEqual(80)
    expect(summary.forecastMonthlyCents).toBeNull()
  })

  it('ignores reopened Lost rows when summarizing a currently lost person', () => {
    const summary = summarizeLeadLine(line({
      id: 2,
      firstName: 'Jaime',
      relationship: 'CHILD',
      status: 'LOST',
      lostOutcomes: [
        { id: 1, createdAt: '2026-08-01T18:00:00.000Z', reopenedAt: '2026-08-15T18:00:00.000Z', lostReason: { id: 1, name: 'Old reason' } },
        { id: 2, createdAt: sept1, reopenedAt: null, lostReason: { id: 8, name: 'Schedule conflict' } },
      ],
    }))
    expect(summary.lost?.reasonName).toBe('Schedule conflict')
  })

  it('does not label an open sibling as joined or lost because another line is terminal', () => {
    const open = summarizeLeadLine(line({
      id: 3,
      firstName: 'Sam',
      relationship: 'CHILD',
      status: 'TRIAL_SCHEDULED',
      program: { name: 'Kids BJJ' },
    }))
    expect(open.kind).toBe('open')
    expect(open.statusLabel).toBe('Trial scheduled')
    expect(open.conversion).toBeNull()
    expect(open.lost).toBeNull()
  })

  it('omits missing optional contact fields from the person summary', () => {
    const summary = summarizeLeadLine({
      id: 4,
      firstName: 'Alex',
      lastName: null,
      relationship: 'OTHER',
      status: 'CONTACTED',
      age: null,
      program: null,
      membershipOffering: null,
      conversions: [],
      lostOutcomes: [],
      trials: [],
    })
    expect(summary.age).toBeNull()
    expect(summary.programName).toBeNull()
    expect(summary.offeringName).toBeNull()
    expect(summary.latestTrial).toBeNull()
    expect(summary.lost).toBeNull()
  })

  it('includes open Forecast MRR only when the line is still eligible', () => {
    const openForecast: SummaryForecastLine = {
      leadLineId: 1,
      forecastMonthlyCents: 17500,
      includedInForecast: true,
    }
    const open = summarizeLeadLine(line({
      id: 1,
      firstName: 'Josh',
      relationship: 'SELF',
      status: 'CONTACTED',
      membershipOffering: { name: 'Adult BJJ Membership', monthlyCents: 17500 },
    }), openForecast)
    expect(open.forecastMonthlyCents).toBe(17500)
    expect(open.offeringName).toBe('Adult BJJ Membership')
  })

  it('derives CLOSED mixed household status from JOINED + LOST lines', () => {
    const display = householdDisplayStatus({
      status: 'TRIAL_ATTENDED',
      closedAt: sept1,
      lines: [{ status: 'JOINED' }, { status: 'LOST' }],
    })
    expect(display.key).toBe('CLOSED_MIXED')
    expect(display.label).toBe('Closed · mixed outcomes')
  })

  it('derives ACTIVE mixed household status when an open person remains with JOINED and LOST siblings', () => {
    const display = householdDisplayStatus({
      status: 'TRIAL_SCHEDULED',
      closedAt: null,
      lines: [{ status: 'JOINED' }, { status: 'LOST' }, { status: 'TRIAL_SCHEDULED' }],
    })
    expect(display.key).toBe('ACTIVE_MIXED')
    expect(display.label).toBe('Active · mixed outcomes')
  })

  it('uses compact follow-up empty mode when no pending calls remain', () => {
    expect(householdFollowUpMode(0)).toBe('empty')
    expect(householdFollowUpMode(2)).toBe('open')
  })

  it('uses compact $0 forecast mode and only lists remaining open opportunity rows', () => {
    expect(householdForecastMode(0)).toBe('zero')
    expect(householdForecastMode(17500)).toBe('active')
    expect(openForecastBreakdownRows([
      { leadLineId: 1, forecastMonthlyCents: 0, includedInForecast: false },
      { leadLineId: 2, forecastMonthlyCents: 15500, includedInForecast: true },
      { leadLineId: 3, forecastMonthlyCents: 0, includedInForecast: true },
    ]).map(row => row.leadLineId)).toEqual([2])
  })
})
