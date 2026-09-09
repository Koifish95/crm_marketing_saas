import { leadStatusLabel, leadStatusTone, lineRelationshipLabel, trialStatusLabel, trialStatusTone } from './labels'
import type { BadgeTone } from './labels'

export interface SummaryTrial {
  id: number
  status: string
  scheduledAt: string | Date
  label?: string | null
  canRecordTrialOutcome?: boolean
}

export interface SummaryConversion {
  id: number
  monthlyCents: number
  enrollmentCents: number
  offeringName?: string | null
  joinedAt: string | Date
  reversedAt?: string | Date | null
}

export interface SummaryLostOutcome {
  id: number
  note?: string | null
  createdAt: string | Date
  reopenedAt?: string | Date | null
  lostReason?: { id: number, name: string } | null
}

export interface SummaryForecastLine {
  leadLineId: number
  forecastMonthlyCents: number
  enrollmentCents?: number
  overridden?: boolean
  includedInForecast?: boolean
}

export interface SummaryLeadLine {
  id: number
  firstName: string
  lastName?: string | null
  relationship: string
  age?: number | null
  status: string
  notes?: string | null
  program?: { id?: number, code?: string, name?: string } | null
  membershipOffering?: { id?: number, name?: string, monthlyCents?: number, enrollmentCents?: number } | null
  conversions?: SummaryConversion[]
  lostOutcomes?: SummaryLostOutcome[]
  trials?: SummaryTrial[]
}

export type LineSummaryKind = 'open' | 'joined' | 'lost'

export interface LeadLineAcquisitionSummary {
  lineId: number
  kind: LineSummaryKind
  status: string
  statusLabel: string
  statusTone: BadgeTone
  relationshipLabel: string
  programName: string | null
  age: number | null
  latestTrial: SummaryTrial | null
  nextScheduledTrial: SummaryTrial | null
  offeringName: string | null
  forecastMonthlyCents: number | null
  conversion: SummaryConversion | null
  lost: {
    createdAt: string | Date
    reasonName: string | null
    noteExcerpt: string | null
  } | null
}

const LOST_NOTE_EXCERPT_MAX = 80

function trialMs(trial: SummaryTrial) {
  return new Date(trial.scheduledAt).getTime()
}

export function isTerminalLineStatus(status: string) {
  return status === 'JOINED' || status === 'LOST'
}

export function nextScheduledTrial(trials: SummaryTrial[] | null | undefined): SummaryTrial | null {
  return [...(trials ?? [])]
    .filter(trial => trial.status === 'SCHEDULED')
    .sort((a, b) => trialMs(a) - trialMs(b))[0] ?? null
}

/** Current intro if scheduled; otherwise the latest attended/no-show. Cancelled/rescheduled rows are not current. */
export function latestRelevantTrial(trials: SummaryTrial[] | null | undefined): SummaryTrial | null {
  const scheduled = nextScheduledTrial(trials)
  if (scheduled) {
    return scheduled
  }
  return [...(trials ?? [])]
    .filter(trial => trial.status === 'ATTENDED' || trial.status === 'NO_SHOW')
    .sort((a, b) => trialMs(b) - trialMs(a))[0] ?? null
}

export function activeConversion(conversions: SummaryConversion[] | null | undefined): SummaryConversion | null {
  return (conversions ?? []).find(row => !row.reversedAt) ?? null
}

export function activeLostOutcome(outcomes: SummaryLostOutcome[] | null | undefined): SummaryLostOutcome | null {
  return [...(outcomes ?? [])]
    .filter(row => !row.reopenedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
}

export function excerptNote(note: string | null | undefined, max = LOST_NOTE_EXCERPT_MAX): string | null {
  const trimmed = note?.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.length <= max) {
    return trimmed
  }
  return `${trimmed.slice(0, max - 1)}…`
}

export function lineSummaryKind(status: string): LineSummaryKind {
  if (status === 'JOINED') {
    return 'joined'
  }
  if (status === 'LOST') {
    return 'lost'
  }
  return 'open'
}

export function forecastCentsForLine(
  line: Pick<SummaryLeadLine, 'id' | 'status'>,
  forecast: SummaryForecastLine | null | undefined,
): number | null {
  if (isTerminalLineStatus(line.status)) {
    return null
  }
  if (!forecast) {
    return null
  }
  if (forecast.includedInForecast === false) {
    return null
  }
  return forecast.forecastMonthlyCents
}

export function summarizeLeadLine(
  line: SummaryLeadLine,
  forecast?: SummaryForecastLine | null,
): LeadLineAcquisitionSummary {
  const kind = lineSummaryKind(line.status)
  const conversion = kind === 'joined' ? activeConversion(line.conversions) : null
  const lostRow = kind === 'lost' ? activeLostOutcome(line.lostOutcomes) : null
  return {
    lineId: line.id,
    kind,
    status: line.status,
    statusLabel: leadStatusLabel(line.status),
    statusTone: leadStatusTone(line.status),
    relationshipLabel: lineRelationshipLabel(line.relationship),
    programName: line.program?.name ?? null,
    age: line.age ?? null,
    latestTrial: latestRelevantTrial(line.trials),
    nextScheduledTrial: nextScheduledTrial(line.trials),
    offeringName: line.membershipOffering?.name ?? conversion?.offeringName ?? null,
    forecastMonthlyCents: forecastCentsForLine(line, forecast),
    conversion,
    lost: lostRow
      ? {
          createdAt: lostRow.createdAt,
          reasonName: lostRow.lostReason?.name ?? null,
          noteExcerpt: excerptNote(lostRow.note),
        }
      : null,
  }
}

export function trialStatusCopy(trial: SummaryTrial | null) {
  if (!trial) {
    return null
  }
  return {
    label: trialStatusLabel(trial.status),
    tone: trialStatusTone(trial.status),
  }
}

export function householdFollowUpMode(pendingCount: number) {
  return pendingCount > 0 ? 'open' as const : 'empty' as const
}

export function householdForecastMode(monthlyCents: number) {
  return monthlyCents > 0 ? 'active' as const : 'zero' as const
}

export function openForecastBreakdownRows<T extends { includedInForecast?: boolean, forecastMonthlyCents: number }>(
  rows: T[],
) {
  return rows.filter(row => row.includedInForecast && row.forecastMonthlyCents > 0)
}
