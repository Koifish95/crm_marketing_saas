import { z } from 'zod'
import { contentChannelSchema, contentStatusSchema } from './enums'

export const createContentItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(8000).optional(),
  status: contentStatusSchema.optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  publisherUserId: z.number().int().positive().nullable().optional(),
  approvalRequired: z.boolean().optional(),
  plannedPublishAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(4000).optional(),
  channels: z.array(contentChannelSchema).min(1).max(5),
})

export const updateContentItemSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().max(8000).nullable().optional(),
  status: contentStatusSchema.optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  publisherUserId: z.number().int().positive().nullable().optional(),
  approvalRequired: z.boolean().optional(),
  plannedPublishAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  channels: z.array(contentChannelSchema).min(1).max(5).optional(),
})

export const approveContentItemSchema = z.object({
  note: z.string().max(500).optional(),
})

export const recordContentPublicationSchema = z.object({
  channel: contentChannelSchema,
  publishedAt: z.coerce.date().optional(),
  publicUrl: z.string().max(500).optional(),
  externalPostId: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export const listContentQuerySchema = z.object({
  campaignId: z.coerce.number().int().positive().optional(),
})
