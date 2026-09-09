import { z } from 'zod'
import {
  acquisitionEventStatusSchema,
  eventAttendanceSchema,
  eventQuestionFieldTypeSchema,
  leadLineRelationshipSchema,
  leadSourceSchema,
} from './enums'

export const createAcquisitionEventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  description: z.string().max(8000).optional(),
  status: acquisitionEventStatusSchema.optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  programId: z.number().int().positive().nullable().optional(),
  registrationOpensAt: z.coerce.date().nullable().optional(),
  registrationClosesAt: z.coerce.date().nullable().optional(),
})

export const updateAcquisitionEventSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().max(80).optional(),
  description: z.string().max(8000).nullable().optional(),
  status: acquisitionEventStatusSchema.optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  programId: z.number().int().positive().nullable().optional(),
  registrationOpensAt: z.coerce.date().nullable().optional(),
  registrationClosesAt: z.coerce.date().nullable().optional(),
  registrationManuallyClosed: z.boolean().optional(),
})

export const createEventSessionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable().optional(),
  programId: z.number().int().positive().nullable().optional(),
  minAge: z.number().int().min(0).max(120).nullable().optional(),
  maxAge: z.number().int().min(0).max(120).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
})

export const updateEventSessionSchema = createEventSessionSchema.partial()

export const createEventQuestionSchema = z.object({
  prompt: z.string().trim().min(1).max(300),
  fieldType: eventQuestionFieldTypeSchema,
  options: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  required: z.boolean().optional(),
})

const eventParticipantSchema = z.object({
  sessionId: z.number().int().positive(),
  relationship: leadLineRelationshipSchema.optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().max(80).optional(),
  age: z.number().int().min(0).max(120).optional(),
})

const publicAttributionFields = {
  source: z.string().trim().max(40).optional(),
  campaign: z.string().trim().max(80).optional(),
  trackingCode: z.string().trim().max(32).optional(),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmContent: z.string().trim().max(80).optional(),
  utmTerm: z.string().trim().max(80).optional(),
  company: z.string().max(80).optional(),
}

export const publicEventRegisterSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().min(7).max(32),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  participants: z.array(eventParticipantSchema).min(1).max(12),
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    value: z.string().trim().max(200),
  })).optional(),
  ...publicAttributionFields,
}).superRefine((value, ctx) => {
  if (value.company?.trim()) {
    ctx.addIssue({ code: 'custom', message: 'Unable to submit.', path: ['company'] })
  }
})

export const staffEventRegisterSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  source: leadSourceSchema.optional(),
  notes: z.string().max(2000).optional(),
  participants: z.array(eventParticipantSchema).min(1).max(12),
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    value: z.string().trim().max(200),
  })).optional(),
  campaignId: z.number().int().positive().nullable().optional(),
})

export const updateEventRegistrationSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  excludeFromProcessing: z.boolean().optional(),
  source: leadSourceSchema.nullable().optional(),
})

export const updateEventRegistrationLineSchema = z.object({
  sessionId: z.number().int().positive().optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().max(80).nullable().optional(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  relationship: leadLineRelationshipSchema.optional(),
  attendance: eventAttendanceSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const eventBatchProcessSchema = z.object({
  excludeRegistrationIds: z.array(z.number().int().positive()).optional(),
  includeCancelledRegistrationIds: z.array(z.number().int().positive()).optional(),
  forceNewRegistrationIds: z.array(z.number().int().positive()).optional(),
  confirmations: z.array(z.object({
    registrationId: z.number().int().positive(),
    leadId: z.number().int().positive(),
  })).optional(),
})

export const listEventsQuerySchema = z.object({
  campaignId: z.coerce.number().int().positive().optional(),
})
