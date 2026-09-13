import { z } from 'zod'
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  LEAD_STAGES,
  LOSS_REASONS,
  NOTE_RECORD_KINDS,
  OPPORTUNITY_STAGES,
} from '../utils/pipeline'
import {
  CAMPAIGN_STATUSES,
  COMPANY_LIFECYCLES,
  INTAKE_FIELD_IDS,
  OFFER_PRICING_TYPES,
  REPORT_RANGE_PRESETS,
} from '../utils/catalog'

export const leadStageSchema = z.enum(LEAD_STAGES)
export const opportunityStageSchema = z.enum(OPPORTUNITY_STAGES)
export const lossReasonSchema = z.enum(LOSS_REASONS)
export const activityTypeSchema = z.enum(ACTIVITY_TYPES)
export const activityStatusSchema = z.enum(ACTIVITY_STATUSES)
export const noteRecordKindSchema = z.enum(NOTE_RECORD_KINDS)
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES)
export const companyLifecycleSchema = z.enum(COMPANY_LIFECYCLES)
export const offerPricingTypeSchema = z.enum(OFFER_PRICING_TYPES)
export const reportRangePresetSchema = z.enum(REPORT_RANGE_PRESETS)

const optionalId = z.coerce.number().int().positive().optional()
const nullableId = z.coerce.number().int().positive().nullable().optional()

export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).optional(),
  active: z.boolean().optional(),
  lifecycle: companyLifecycleSchema.optional(),
})

export const patchCompanySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  active: z.boolean().optional(),
  lifecycle: companyLifecycleSchema.optional(),
})

export const createContactSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(80).optional(),
  title: z.string().trim().max(120).optional(),
})

export const patchContactSchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  title: z.string().trim().max(120).nullable().optional(),
})

export const createLeadSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(80).optional(),
  reachabilityNote: z.string().trim().max(2000).optional(),
  accountId: z.coerce.number().int().positive().optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  stage: z.enum(['new', 'contacted', 'qualified']).optional(),
  sourceId: optionalId,
  campaignId: optionalId,
  sourceDetail: z.string().trim().max(500).optional(),
  intakeCompanyName: z.string().trim().max(200).optional(),
})

export const patchLeadSchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  reachabilityNote: z.string().trim().max(2000).nullable().optional(),
  accountId: z.coerce.number().int().positive().nullable().optional(),
  ownerUserId: z.coerce.number().int().positive().nullable().optional(),
  stage: z.enum(['new', 'contacted', 'qualified']).optional(),
  sourceId: nullableId,
  campaignId: nullableId,
  sourceDetail: z.string().trim().max(500).nullable().optional(),
  intakeCompanyName: z.string().trim().max(200).nullable().optional(),
})

export const createOpportunitySchema = z.object({
  accountId: z.coerce.number().int().positive(),
  primaryContactId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200),
  amountCents: z.coerce.number().int().nonnegative().optional(),
  stage: z.enum(['proposal_quote', 'decision']).optional(),
  notes: z.string().trim().max(4000).optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  sourceId: optionalId,
  campaignId: optionalId,
  sourceDetail: z.string().trim().max(500).optional(),
})

export const patchOpportunitySchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  primaryContactId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  stage: z.enum(['proposal_quote', 'decision']).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  sourceId: nullableId,
  campaignId: nullableId,
  sourceDetail: z.string().trim().max(500).nullable().optional(),
})

export const markLostSchema = z.object({
  lossReason: lossReasonSchema,
  lossNotes: z.string().trim().max(4000).optional(),
})

export const createActivitySchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  contactId: z.coerce.number().int().positive().optional(),
  opportunityId: z.coerce.number().int().positive().optional(),
  leadId: z.coerce.number().int().positive().optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  type: activityTypeSchema.optional(),
  description: z.string().trim().min(1).max(2000),
  notes: z.string().trim().max(4000).optional(),
  dueAt: z.coerce.number().int().optional(),
}).refine(value => value.accountId || value.contactId || value.opportunityId || value.leadId, {
  message: 'Attach this activity to a lead, company, contact, or opportunity.',
})

export const patchActivitySchema = z.object({
  description: z.string().trim().min(1).max(2000).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  dueAt: z.coerce.number().int().nullable().optional(),
  type: activityTypeSchema.optional(),
  status: activityStatusSchema.optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  completed: z.boolean().optional(),
  leadId: z.coerce.number().int().positive().nullable().optional(),
  opportunityId: z.coerce.number().int().positive().nullable().optional(),
})

export const createNoteSchema = z.object({
  recordKind: noteRecordKindSchema,
  recordId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1).max(8000),
})

export const createSourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(80).optional(),
})

export const patchSourceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional(),
})

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  status: campaignStatusSchema.optional(),
  startsAt: z.coerce.number().int().nullable().optional(),
  endsAt: z.coerce.number().int().nullable().optional(),
  budgetCents: z.coerce.number().int().nonnegative().nullable().optional(),
})

export const patchCampaignSchema = createCampaignSchema.partial()

export const createTrackingLinkSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  sourceId: z.coerce.number().int().positive(),
  label: z.string().trim().min(1).max(200),
  active: z.boolean().optional(),
})

export const patchTrackingLinkSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  active: z.boolean().optional(),
  sourceId: z.coerce.number().int().positive().optional(),
})

export const createOfferSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  pricingType: offerPricingTypeSchema,
  defaultUnitPriceCents: z.coerce.number().int().nonnegative(),
  active: z.boolean().optional(),
})

export const patchOfferSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  pricingType: offerPricingTypeSchema.optional(),
  defaultUnitPriceCents: z.coerce.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
})

export const createOpportunityLineSchema = z.object({
  offerId: z.coerce.number().int().positive().optional(),
  description: z.string().trim().min(1).max(200).optional(),
  quantity: z.coerce.number().int().positive().optional(),
  pricingType: offerPricingTypeSchema.optional(),
  unitPriceCents: z.coerce.number().int().nonnegative().optional(),
})

export const patchOpportunityLineSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  quantity: z.coerce.number().int().positive().optional(),
  pricingType: offerPricingTypeSchema.optional(),
  unitPriceCents: z.coerce.number().int().nonnegative().optional(),
})

export const publicIntakeSubmitSchema = z.object({
  token: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
  website: z.string().max(200).optional(),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(80).optional(),
  companyName: z.string().trim().max(200).optional(),
  message: z.string().trim().max(4000).optional(),
})

export const patchPublicIntakeConfigSchema = z.object({
  enabled: z.boolean().optional(),
  introText: z.string().max(2000).optional(),
  helpText: z.string().max(2000).optional(),
  submitLabel: z.string().trim().min(1).max(80).optional(),
  thankYouText: z.string().max(2000).optional(),
  unavailableText: z.string().max(2000).optional(),
  fields: z.array(z.object({
    id: z.enum(INTAKE_FIELD_IDS),
    label: z.string().trim().min(1).max(120),
    visible: z.boolean(),
    required: z.boolean(),
    order: z.coerce.number().int(),
    helpText: z.string().max(500).optional().default(''),
  })).optional(),
})

export const dashboardQuerySchema = z.object({
  preset: reportRangePresetSchema.optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const patchProposalDraftSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  intro: z.string().max(8000).nullable().optional(),
  terms: z.string().max(8000).nullable().optional(),
  notes: z.string().max(8000).nullable().optional(),
  validThrough: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  recipientContactId: z.coerce.number().int().positive().nullable().optional(),
})

export const patchProposalLetterheadSchema = z.object({
  businessName: z.string().trim().min(1).max(200).optional(),
  address: z.string().max(800).optional(),
  phone: z.string().max(80).optional(),
  email: z.string().max(200).optional(),
  website: z.string().max(200).optional(),
  footer: z.string().max(4000).optional(),
})
