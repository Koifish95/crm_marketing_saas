export const OPPORTUNITY_STAGES = ['open', 'in_progress', 'won', 'lost'] as const
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number]

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  open: 'Open',
  in_progress: 'In progress',
  won: 'Won',
  lost: 'Lost',
}

export function isOpportunityStage(value: string): value is OpportunityStage {
  return (OPPORTUNITY_STAGES as readonly string[]).includes(value)
}

export function opportunityStageLabel(stage: string) {
  return isOpportunityStage(stage) ? OPPORTUNITY_STAGE_LABELS[stage] : stage
}
