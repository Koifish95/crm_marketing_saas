import { z } from 'zod'
import { trialStatusSchema } from './enums'

export const createTrialSchema = z.object({
  leadId: z.number().int().positive().optional(),
  scheduledAt: z.coerce.date(),
  label: z.string().max(200).optional(),
  status: trialStatusSchema.default('SCHEDULED'),
  notes: z.string().max(4000).optional(),
})

export const trialOutcomeSchema = z.object({
  status: z.enum(['ATTENDED', 'NO_SHOW', 'CANCELLED']),
  notes: z.string().max(4000).optional(),
})

export const rescheduleTrialSchema = z.object({
  slotId: z.string().min(1).max(120),
  notes: z.string().max(4000).optional(),
})

/** Staff create uses the same bookable-slot contract as reschedule. */
export const staffCreateTrialSchema = z.object({
  slotId: z.string().min(1).max(120),
  notes: z.string().max(4000).optional(),
  leadLineId: z.number().int().positive().optional(),
})
