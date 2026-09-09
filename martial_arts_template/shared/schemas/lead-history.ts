import { z } from 'zod'
import { leadStatusSchema } from './enums'

export const createLeadNoteSchema = z.object({
  leadId: z.number().int().positive(),
  body: z.string().min(1).max(8000),
  createdByUserId: z.number().int().positive().optional(),
})

export const createLeadStatusHistorySchema = z.object({
  leadId: z.number().int().positive(),
  fromStatus: leadStatusSchema.optional(),
  toStatus: leadStatusSchema,
  changedByUserId: z.number().int().positive().optional(),
  note: z.string().max(4000).optional(),
})
