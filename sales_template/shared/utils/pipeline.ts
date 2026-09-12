export const LEAD_STAGES = ['new', 'contacted', 'qualified', 'converted'] as const
export type LeadStage = (typeof LEAD_STAGES)[number]

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
}

export const OPEN_LEAD_STAGES = ['new', 'contacted', 'qualified'] as const

export const OPPORTUNITY_STAGES = ['proposal_quote', 'decision', 'won', 'lost'] as const
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number]

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  proposal_quote: 'Proposal / Quote',
  decision: 'Decision',
  won: 'Won',
  lost: 'Lost',
}

export const ACTIVE_OPPORTUNITY_STAGES = ['proposal_quote', 'decision'] as const
export const TERMINAL_OPPORTUNITY_STAGES = ['won', 'lost'] as const

export const LOSS_REASONS = [
  'budget',
  'timing',
  'chose_another_provider',
  'no_longer_needed',
  'could_not_reach',
  'not_a_fit',
  'other',
] as const
export type LossReason = (typeof LOSS_REASONS)[number]

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  budget: 'Budget',
  timing: 'Timing',
  chose_another_provider: 'Chose another provider',
  no_longer_needed: 'No longer needed',
  could_not_reach: 'Could not reach',
  not_a_fit: 'Not a fit',
  other: 'Other',
}

export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task', 'other'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  task: 'Task',
  other: 'Other',
}

export const ACTIVITY_STATUSES = ['open', 'completed', 'cancelled'] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export const NOTE_RECORD_KINDS = ['lead', 'company', 'contact', 'opportunity'] as const
export type NoteRecordKind = (typeof NOTE_RECORD_KINDS)[number]

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value)
}

export function leadStageLabel(stage: string) {
  return isLeadStage(stage) ? LEAD_STAGE_LABELS[stage] : stage
}

export function isOpportunityStage(value: string): value is OpportunityStage {
  return (OPPORTUNITY_STAGES as readonly string[]).includes(value)
}

export function opportunityStageLabel(stage: string) {
  return isOpportunityStage(stage) ? OPPORTUNITY_STAGE_LABELS[stage] : stage
}

export function isActiveOpportunityStage(stage: string) {
  return (ACTIVE_OPPORTUNITY_STAGES as readonly string[]).includes(stage)
}

export function isTerminalOpportunityStage(stage: string) {
  return (TERMINAL_OPPORTUNITY_STAGES as readonly string[]).includes(stage)
}

export function isLossReason(value: string): value is LossReason {
  return (LOSS_REASONS as readonly string[]).includes(value)
}

export function lossReasonLabel(reason: string) {
  return isLossReason(reason) ? LOSS_REASON_LABELS[reason] : reason
}

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value)
}

export function isActivityStatus(value: string): value is ActivityStatus {
  return (ACTIVITY_STATUSES as readonly string[]).includes(value)
}

export function isNoteRecordKind(value: string): value is NoteRecordKind {
  return (NOTE_RECORD_KINDS as readonly string[]).includes(value)
}

export function splitDisplayName(displayName: string) {
  const trimmed = displayName.trim()
  const space = trimmed.indexOf(' ')
  if (space === -1) {
    return { firstName: trimmed, lastName: '-' }
  }
  return {
    firstName: trimmed.slice(0, space).trim(),
    lastName: trimmed.slice(space + 1).trim() || '-',
  }
}
