import { z } from 'zod'

export const ticketSources = ['MANUAL', 'QA_AGENT', 'CUSTOMER', 'SYSTEM'] as const
export const ticketCategories = ['BUG', 'UI', 'UX', 'FEATURE', 'SECURITY', 'PERFORMANCE', 'ACCESSIBILITY', 'SUPPORT'] as const
export const ticketStatuses = ['NEW', 'TRIAGED', 'READY', 'IN_PROGRESS', 'REVIEW', 'TESTING', 'DONE', 'REJECTED'] as const
export const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
export const findingStatuses = ['NEW', 'REVIEWED', 'TICKETED', 'LINKED', 'DISMISSED', 'DUPLICATE'] as const
export const severities = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const qaRunStatuses = ['RUNNING', 'COMPLETED', 'COMPLETED_WITH_FINDINGS', 'FAILED', 'CANCELLED'] as const

const optionalId = z.string().trim().min(1).max(128).nullable().optional()

export const ticketCreateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(1).max(20_000),
  source: z.enum(ticketSources).default('MANUAL'),
  category: z.enum(ticketCategories),
  priority: z.enum(ticketPriorities).default('MEDIUM'),
  severity: z.enum(severities).nullable().optional(),
  assignee: z.string().trim().max(120).nullable().optional(),
  customerId: optionalId,
  productId: optionalId,
  productInstanceId: optionalId,
  environmentId: optionalId,
})

export const ticketUpdateSchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  priority: z.enum(ticketPriorities).optional(),
  category: z.enum(ticketCategories).optional(),
  severity: z.enum(severities).nullable().optional(),
  assignee: z.string().trim().max(120).nullable().optional(),
  resolution: z.string().trim().max(10_000).nullable().optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one field is required.')

export const ticketCommentSchema = z.object({
  author: z.string().trim().min(1).max(120).default('Operator'),
  body: z.string().trim().min(1).max(10_000),
  visibility: z.enum(['INTERNAL', 'CUSTOMER']).default('INTERNAL'),
})

export const findingReviewSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('dismiss'), note: z.string().trim().min(1).max(5_000) }),
  z.object({ action: z.literal('duplicate'), duplicateOfFindingId: z.string().trim().min(1), note: z.string().trim().max(5_000).optional() }),
  z.object({ action: z.literal('link'), ticketId: z.string().trim().min(1), note: z.string().trim().max(5_000).optional() }),
  z.object({ action: z.literal('create_ticket'), priority: z.enum(ticketPriorities).default('MEDIUM'), assignee: z.string().trim().max(120).optional() }),
])

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>
