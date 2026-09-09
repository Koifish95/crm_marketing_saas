import { z } from 'zod'
import { assetMarketingUseSchema } from './enums'

export const updateAssetSchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  marketingUseStatus: assetMarketingUseSchema.optional(),
  restrictionNote: z.string().max(2000).nullable().optional(),
  campaignId: z.number().int().positive().nullable().optional(),
  contentItemId: z.number().int().positive().nullable().optional(),
  archived: z.boolean().optional(),
})

export const attachAssetSchema = z.object({
  contentItemId: z.number().int().positive().optional(),
  campaignId: z.number().int().positive().optional(),
}).refine(value => Boolean(value.contentItemId) || Boolean(value.campaignId), {
  message: 'Attach this asset to a content item or a campaign.',
})

export const listAssetsQuerySchema = z.object({
  campaignId: z.coerce.number().int().positive().optional(),
})
