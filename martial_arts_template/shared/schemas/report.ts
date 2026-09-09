import { z } from 'zod'

export const reportFiltersSchema = z.object({
  fromYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  programId: z.coerce.number().int().positive().optional(),
  source: z.string().min(1).optional(),
  campaignId: z.coerce.number().int().positive().optional(),
})

export const reportExportKindSchema = z.enum(['leads', 'conversions', 'campaigns', 'meta'])

export const reportExportQuerySchema = reportFiltersSchema.extend({
  kind: reportExportKindSchema.default('leads'),
})

export type ReportFilters = z.infer<typeof reportFiltersSchema>
export type ReportExportKind = z.infer<typeof reportExportKindSchema>
