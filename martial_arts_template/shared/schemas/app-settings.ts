import { z } from 'zod'

export const patchAppSettingsSchema = z.object({
  allowEarlyTrialOutcomes: z.boolean().optional(),
  trackedAcquisitionOwnerUserId: z.number().int().positive().nullable().optional(),
}).refine(
  data => data.allowEarlyTrialOutcomes !== undefined || data.trackedAcquisitionOwnerUserId !== undefined,
  { message: 'Provide a setting to update.' },
)
