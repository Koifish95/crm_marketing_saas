export const ALLOW_EARLY_TRIAL_OUTCOMES_KEY = 'allowEarlyTrialOutcomes'
export const ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT = true
export const ALLOW_EARLY_TRIAL_OUTCOMES_LABEL = 'Allow early Trial outcomes'
export const ALLOW_EARLY_TRIAL_OUTCOMES_DESCRIPTION
  = 'Allow authorized staff to mark a Trial as Attended or No-show before its scheduled start time.'
export const EARLY_TRIAL_OUTCOME_BLOCKED_MESSAGE
  = 'This Trial cannot be marked Attended or No-show until its scheduled start time.'
export const INVALID_TRIAL_OUTCOME_MESSAGE = 'Only a scheduled Trial can be marked Attended or No-show.'

export function mayRecordTrialOutcome(input: {
  allowEarlyTrialOutcomes: boolean
  scheduledAtMs: number
  nowMs: number
}) {
  return input.allowEarlyTrialOutcomes || input.nowMs >= input.scheduledAtMs
}

export function canRecordScheduledTrialOutcome(input: {
  trialStatus: string
  allowEarlyTrialOutcomes: boolean
  scheduledAtMs: number
  nowMs: number
}) {
  if (input.trialStatus !== 'SCHEDULED') {
    return false
  }
  return mayRecordTrialOutcome(input)
}
