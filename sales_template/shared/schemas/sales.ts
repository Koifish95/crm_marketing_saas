import { z } from 'zod'
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  LEAD_STAGES,
  LOSS_REASONS,
  NOTE_RECORD_KINDS,
  OPPORTUNITY_STAGES,
} from '../utils/pipeline'

export const leadStageSchema = z.enum(LEAD_STAGES)
export const opportunityStageSchema = z.enum(OPPORTUNITY_STAGES)
export const lossReasonSchema = z.enum(LOSS_REASONS)
export const activityTypeSchema = z.enum(ACTIVITY_TYPES)
export const activityStatusSchema = z.enum(ACTIVITY_STATUSES)
export const noteRecordKindSchema = z.enum(NOTE_RECORD_KINDS)

export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).optional(),
  active: z.boolean().optional(),
})

export const patchCompanySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  active: z.boolean().optional(),
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
})

export const patchLeadSchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(80).nullable().optional(),
  reachabilityNote: z.string().trim().max(2000).nullable().optional(),
  accountId: z.coerce.number().int().positive().nullable().optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  stage: z.enum(['new', 'contacted', 'qualified']).optional(),
})

export const createOpportunitySchema = z.object({
  accountId: z.coerce.number().int().positive(),
  primaryContactId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200),
  amountCents: z.coerce.number().int().nonnegative().optional(),
  stage: z.enum(['proposal_quote', 'decision']).optional(),
  notes: z.string().trim().max(4000).optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
})

export const patchOpportunitySchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  primaryContactId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  amountCents: z.coerce.number().int().nonnegative().nullable().optional(),
  stage: z.enum(['proposal_quote', 'decision']).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
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
