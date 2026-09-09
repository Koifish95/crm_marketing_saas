import { z } from 'zod'

export const assignCompensationSchema = z.object({
  creditedUserId: z.number().int().positive().nullable(),
  reason: z.string().trim().min(3, 'Explain this assignment in a few words.').max(500),
  eligibility: z.enum(['UNASSIGNED', 'ELIGIBLE', 'INELIGIBLE']).optional(),
})

export const markCompensationPaidSchema = z.object({
  paidAt: z.coerce.date().optional(),
})
