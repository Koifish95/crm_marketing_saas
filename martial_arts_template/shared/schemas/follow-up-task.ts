import { z } from 'zod'
import {
  followUpCallOutcomeSchema,
  followUpTaskStatusSchema,
  followUpTaskTypeSchema,
} from './enums'

export const followUpTaskViewSchema = z.enum([
  'open',
  'due_today',
  'overdue',
  'upcoming',
  'completed',
  'cancelled',
])

export const createFollowUpTaskSchema = z.object({
  leadId: z.number().int().positive(),
  trialId: z.number().int().positive().optional(),
  type: followUpTaskTypeSchema.default('PHONE_CALL'),
  dueAt: z.coerce.date(),
  status: followUpTaskStatusSchema.default('PENDING'),
  assignedUserId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(4000).optional(),
  leadLineIds: z.array(z.number().int().positive()).optional(),
})

export const listFollowUpTasksQuerySchema = z.object({
  view: followUpTaskViewSchema.default('open'),
})

export const patchFollowUpTaskSchema = z.object({
  action: z.enum(['complete', 'cancel', 'assign']),
  assignedUserId: z.number().int().positive().nullable().optional(),
  outcome: followUpCallOutcomeSchema.optional(),
  notes: z.string().max(4000).optional(),
})

export type FollowUpTaskView = z.infer<typeof followUpTaskViewSchema>
