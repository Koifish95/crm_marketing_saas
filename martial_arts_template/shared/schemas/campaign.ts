import { z } from 'zod'
import { campaignStatusSchema } from './enums'

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  kind: z.enum(['ORGANIC', 'PAID']).default('ORGANIC'),
  budgetCents: z.number().int().min(0).nullable().optional(),
  channel: z.string().max(64).optional(),
  active: z.boolean().optional(),
  status: campaignStatusSchema.optional(),
  description: z.string().max(4000).optional(),
  objective: z.string().max(500).optional(),
  offer: z.string().max(500).optional(),
  targetAudience: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
  ownerUserId: z.number().int().positive().nullable().optional(),
  collaboratorUserIds: z.array(z.number().int().positive()).max(50).optional(),
  programIds: z.array(z.number().int().positive()).max(50).optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  actualStartsAt: z.coerce.date().nullable().optional(),
  actualEndsAt: z.coerce.date().nullable().optional(),
})

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  kind: z.enum(['ORGANIC', 'PAID']).optional(),
  budgetCents: z.number().int().min(0).nullable().optional(),
  channel: z.string().max(64).nullable().optional(),
  active: z.boolean().optional(),
  status: campaignStatusSchema.optional(),
  description: z.string().max(4000).nullable().optional(),
  objective: z.string().max(500).nullable().optional(),
  offer: z.string().max(500).nullable().optional(),
  targetAudience: z.string().max(500).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  ownerUserId: z.number().int().positive().nullable().optional(),
  collaboratorUserIds: z.array(z.number().int().positive()).max(50).optional(),
  programIds: z.array(z.number().int().positive()).max(50).optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  actualStartsAt: z.coerce.date().nullable().optional(),
  actualEndsAt: z.coerce.date().nullable().optional(),
})

export const trackingLinkPublicSlugSchema = z.string().trim().toLowerCase().min(1).max(80).regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Use lowercase letters, numbers, and hyphens.',
)

const optionalTrackingLinkPublicSlugSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim().toLowerCase()
  return normalized === '' ? undefined : normalized
}, trackingLinkPublicSlugSchema.optional())

export const createCampaignTrackingLinkSchema = z.object({
  label: z.string().min(1).max(80),
  publicSlug: optionalTrackingLinkPublicSlugSchema,
  destinationPath: z.string().min(1).max(200).optional(),
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmContent: z.string().max(80).optional(),
  utmTerm: z.string().max(80).optional(),
})

export const updateCampaignTrackingLinkSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  publicSlug: optionalTrackingLinkPublicSlugSchema,
}).refine(value => value.label !== undefined || value.publicSlug !== undefined, {
  message: 'No changes provided.',
})

export const mapCampaignMetaSchema = z.object({
  campaignId: z.number().int().positive(),
  metaCampaignId: z.number().int().positive(),
})

export const campaignIdQuerySchema = z.object({
  campaignId: z.coerce.number().int().positive().optional(),
})
