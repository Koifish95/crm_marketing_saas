import { z } from 'zod'
import { marketingTaskStatusSchema, marketingTaskTypeSchema } from './enums'

export const createMarketingTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: marketingTaskTypeSchema.default('OTHER'),
  description: z.string().max(4000).optional(),
  dueAt: z.coerce.date(),
  assigneeUserId: z.number().int().positive().nullable().optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  contentItemId: z.number().int().positive().nullable().optional(),
  assetId: z.number().int().positive().nullable().optional(),
  eventId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(4000).optional(),
})

export const updateMarketingTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  type: marketingTaskTypeSchema.optional(),
  description: z.string().max(4000).nullable().optional(),
  dueAt: z.coerce.date().optional(),
  status: marketingTaskStatusSchema.optional(),
  assigneeUserId: z.number().int().positive().nullable().optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  contentItemId: z.number().int().positive().nullable().optional(),
  assetId: z.number().int().positive().nullable().optional(),
  eventId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

export const listMarketingTasksQuerySchema = z.object({
  view: z.enum(['overdue', 'due_today', 'upcoming', 'all']).optional(),
  campaignId: z.coerce.number().int().positive().optional(),
})
