import { z } from 'zod'
import { OPPORTUNITY_STAGES } from '../utils/pipeline'

export const opportunityStageSchema = z.enum(OPPORTUNITY_STAGES)

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

export const createOpportunitySchema = z.object({
  accountId: z.coerce.number().int().positive(),
  primaryContactId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200),
  amountCents: z.coerce.number().int().nonnegative().optional(),
  stage: opportunityStageSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
})

export const patchOpportunitySchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  primaryContactId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  amountCents: z.coerce.number().int().nonnegative().nullable().optional(),
  stage: opportunityStageSchema.optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
})

export const createActivitySchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  contactId: z.coerce.number().int().positive().optional(),
  opportunityId: z.coerce.number().int().positive().optional(),
  description: z.string().trim().min(1).max(2000),
  dueAt: z.coerce.number().int().optional(),
}).refine(value => value.accountId || value.contactId || value.opportunityId, {
  message: 'Attach this activity to a company, contact, or opportunity.',
})

export const patchActivitySchema = z.object({
  description: z.string().trim().min(1).max(2000).optional(),
  dueAt: z.coerce.number().int().nullable().optional(),
  completed: z.boolean().optional(),
})
