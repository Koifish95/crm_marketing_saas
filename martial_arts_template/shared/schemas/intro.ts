import { z } from 'zod'
import { experienceLevelSchema, leadLineRelationshipSchema, leadSourceSchema } from './enums'

export const introExceptionKindSchema = z.enum(['CLOSE_DATE', 'CLOSE_RULE', 'OPEN_SLOT'])

export const introAvailabilityRuleSchema = z.object({
  programId: z.number().int().positive(),
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(24 * 60).nullable().optional(),
  name: z.string().min(1).max(200),
  ageMin: z.number().int().min(0).max(120).nullable().optional(),
  ageMax: z.number().int().min(0).max(120).nullable().optional(),
  enabled: z.boolean().default(true),
  seedKey: z.string().min(1).max(120).optional(),
})

export const updateIntroAvailabilityRuleSchema = introAvailabilityRuleSchema.partial()

export const introExceptionSchema = z.object({
  onDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  kind: introExceptionKindSchema,
  ruleId: z.number().int().positive().nullable().optional(),
  programId: z.number().int().positive().nullable().optional(),
  name: z.string().max(200).nullable().optional(),
  startMinute: z.number().int().min(0).max(1439).nullable().optional(),
  endMinute: z.number().int().min(1).max(24 * 60).nullable().optional(),
  ageMin: z.number().int().min(0).max(120).nullable().optional(),
  ageMax: z.number().int().min(0).max(120).nullable().optional(),
  note: z.string().max(400).nullable().optional(),
})

export const publicAvailabilityQuerySchema = z.object({
  program: z.enum(['ADULT_BJJ', 'KIDS_BJJ']),
  age: z.coerce.number().int().min(0).max(120).optional(),
})

const sourceFromQuery = z.string().trim().max(40).optional()
const idempotencyKeySchema = z.string().uuid()

const publicAttributionFields = {
  source: sourceFromQuery,
  campaign: z.string().trim().max(80).optional(),
  trackingCode: z.string().trim().max(32).optional(),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmContent: z.string().trim().max(80).optional(),
  utmTerm: z.string().trim().max(80).optional(),
  company: z.string().max(80).optional(),
  sourceCode: leadSourceSchema.optional(),
}

function rejectHoneypot(value: { company?: string }, ctx: z.RefinementCtx) {
  if (value.company?.trim()) {
    ctx.addIssue({ code: 'custom', message: 'Unable to submit.', path: ['company'] })
  }
}

export const publicTrialMemberSchema = z.object({
  relationship: leadLineRelationshipSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  age: z.number().int().min(0).max(120).optional(),
  experienceLevel: experienceLevelSchema.optional(),
  programCode: z.enum(['ADULT_BJJ', 'KIDS_BJJ']),
  slotId: z.string().min(1).max(120),
}).superRefine((value, ctx) => {
  if (value.programCode === 'KIDS_BJJ' && value.age == null) {
    ctx.addIssue({ code: 'custom', message: 'Child age is required.', path: ['age'] })
  }
})

export const publicHouseholdTrialSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().trim().min(7).max(32),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  smsConsent: z.boolean().default(false),
  emailConsent: z.boolean().default(false),
  guardianRelationship: z.string().max(80).optional(),
  members: z.array(publicTrialMemberSchema).min(1).max(8),
  idempotencyKey: idempotencyKeySchema,
  ...publicAttributionFields,
}).superRefine((value, ctx) => {
  rejectHoneypot(value, ctx)
  const selfCount = value.members.filter(member => member.relationship === 'SELF').length
  if (selfCount > 1) {
    ctx.addIssue({ code: 'custom', message: 'The primary contact can only be booked once.', path: ['members'] })
  }
})

export const publicTrialSchema = z.object({
  path: z.enum(['ADULT', 'KIDS']),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().trim().min(7).max(32),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  experienceLevel: experienceLevelSchema.default('UNKNOWN'),
  smsConsent: z.boolean().default(false),
  emailConsent: z.boolean().default(false),
  participantFirstName: z.string().max(80).optional(),
  participantLastName: z.string().max(80).optional(),
  participantAge: z.number().int().min(0).max(120).optional(),
  guardianRelationship: z.string().max(80).optional(),
  slotId: z.string().min(1).max(120),
  idempotencyKey: idempotencyKeySchema,
  ...publicAttributionFields,
}).superRefine((value, ctx) => {
  rejectHoneypot(value, ctx)
  if (value.path === 'KIDS') {
    if (!value.participantFirstName?.trim()) {
      ctx.addIssue({ code: 'custom', message: 'Child first name is required.', path: ['participantFirstName'] })
    }
    if (value.participantAge == null) {
      ctx.addIssue({ code: 'custom', message: 'Child age is required.', path: ['participantAge'] })
    }
  }
})
