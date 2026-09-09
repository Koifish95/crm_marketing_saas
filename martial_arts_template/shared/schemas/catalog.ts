import { z } from 'zod'

export const upsertLeadSourceSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const upsertLostReasonSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const upsertMembershipOfferingSchema = z.object({
  name: z.string().min(1).max(120),
  programId: z.number().int().positive(),
  monthlyCents: z.number().int().min(0),
  enrollmentCents: z.number().int().min(0).optional(),
  description: z.string().max(400).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const upsertHouseholdPricingRuleSchema = z.object({
  programId: z.number().int().positive(),
  firstMonthlyCents: z.number().int().min(0),
  additionalMonthlyCents: z.number().int().min(0),
  active: z.boolean().optional(),
})
