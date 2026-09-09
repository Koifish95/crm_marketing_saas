import { z } from 'zod'
import { experienceLevelSchema, householdStatusFilterSchema, leadLineRelationshipSchema, leadSourceSchema, leadStatusSchema } from './enums'

const optionalEmail = z.union([z.string().email(), z.literal('')]).optional()

const leadFields = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  phone: z.string().max(32).optional(),
  email: optionalEmail,
  programId: z.number().int().positive(),
  experienceLevel: experienceLevelSchema.default('UNKNOWN'),
  source: leadSourceSchema,
  status: leadStatusSchema.default('NEW'),
  participantFirstName: z.string().max(80).optional(),
  participantLastName: z.string().max(80).optional(),
  participantAge: z.number().int().min(0).max(120).optional(),
  guardianRelationship: z.string().max(80).optional(),
  campaignId: z.number().int().positive().optional(),
  joinedAt: z.coerce.date().optional(),
  monthlyRateCents: z.number().int().min(0).optional(),
  smsConsent: z.boolean().default(false),
  emailConsent: z.boolean().default(false),
})

export const createLeadSchema = leadFields.refine(value => Boolean(value.phone?.trim() || value.email?.trim()), {
  message: 'A lead requires a phone number or an email address.',
})

export const createHouseholdMemberSchema = z.object({
  relationship: leadLineRelationshipSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  age: z.number().int().min(0).max(120).optional(),
  programId: z.number().int().positive(),
  experienceLevel: experienceLevelSchema.optional(),
  notes: z.string().max(4000).optional(),
})

export const createHouseholdLeadSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  phone: z.string().max(32).optional(),
  email: optionalEmail,
  source: leadSourceSchema,
  campaignId: z.number().int().positive().optional(),
  notes: z.string().max(4000).optional(),
  smsConsent: z.boolean().default(false),
  emailConsent: z.boolean().default(false),
  members: z.array(createHouseholdMemberSchema).min(1).max(8),
  idempotencyKey: z.string().uuid(),
}).superRefine((value, ctx) => {
  if (!value.phone?.trim() && !value.email?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'A lead requires a phone number or an email address.',
      path: ['phone'],
    })
  }
  const selfCount = value.members.filter(member => member.relationship === 'SELF').length
  if (selfCount > 1) {
    ctx.addIssue({
      code: 'custom',
      message: 'This household already has a primary contact (Self). Additional people must be Child, Spouse, or Other.',
      path: ['members'],
    })
  }
})

export const updateLeadSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().max(80).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  programId: z.number().int().positive().optional(),
  experienceLevel: experienceLevelSchema.optional(),
  source: leadSourceSchema.optional(),
  participantFirstName: z.string().max(80).nullable().optional(),
  participantLastName: z.string().max(80).nullable().optional(),
  participantAge: z.number().int().min(0).max(120).nullable().optional(),
  guardianRelationship: z.string().max(80).nullable().optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  smsConsent: z.boolean().optional(),
  emailConsent: z.boolean().optional(),
}).refine((value) => {
  if (value.phone === undefined && value.email === undefined) {
    return true
  }
  if (value.phone !== undefined && value.email !== undefined) {
    return Boolean(value.phone?.trim() || value.email?.trim())
  }
  return true
}, {
  message: 'A lead requires a phone number or an email address.',
})

export const changeLeadStatusSchema = z.object({
  toStatus: leadStatusSchema,
  note: z.string().max(4000).optional(),
  joinedAt: z.coerce.date().optional(),
  monthlyRateCents: z.number().int().min(0).optional(),
  lostReasonId: z.number().int().positive().optional(),
})

export const listLeadsQuerySchema = z.object({
  search: z.string().max(120).optional(),
  status: householdStatusFilterSchema.optional(),
  programId: z.coerce.number().int().positive().optional(),
  source: leadSourceSchema.optional(),
  campaignId: z.coerce.number().int().positive().optional(),
})

export const createLeadLineSchema = z.object({
  relationship: leadLineRelationshipSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  age: z.number().int().min(0).max(120).optional(),
  programId: z.number().int().positive(),
  experienceLevel: experienceLevelSchema.optional(),
  notes: z.string().max(4000).optional(),
  membershipOfferingId: z.number().int().positive().optional(),
  monthlyOverrideCents: z.number().int().min(0).optional(),
  discountReason: z.string().max(400).optional(),
})

export const updateLeadLineSchema = z.object({
  relationship: leadLineRelationshipSchema.optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().max(80).nullable().optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  programId: z.number().int().positive().optional(),
  experienceLevel: experienceLevelSchema.optional(),
  notes: z.string().max(4000).nullable().optional(),
  membershipOfferingId: z.number().int().positive().nullable().optional(),
  monthlyOverrideCents: z.number().int().min(0).nullable().optional(),
  discountReason: z.string().max(400).nullable().optional(),
})

export const changeLeadLineStatusSchema = z.object({
  toStatus: leadStatusSchema,
  note: z.string().max(4000).optional(),
})

export const convertLeadLineSchema = z.object({
  joinedAt: z.coerce.date().optional(),
  note: z.string().max(4000).optional(),
  membershipOfferingId: z.number().int().positive().optional(),
})

export const markLeadLineLostSchema = z.object({
  lostReasonId: z.number().int().positive(),
  note: z.string().max(4000).optional(),
})

export const reverseConversionSchema = z.object({
  note: z.string().min(1).max(4000),
  toStatus: leadStatusSchema.optional(),
})
