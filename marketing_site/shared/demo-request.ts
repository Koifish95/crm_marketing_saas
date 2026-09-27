import { z } from 'zod'

export const attributionSchema = z.object({
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  landing_page: z.string().max(500).optional(),
})

export const demoRequestSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120),
  academy: z.string().trim().min(1, 'Enter the academy name.').max(160),
  email: z.string().trim().email('Enter a valid email address.').max(200),
  phone: z.string().trim().min(7, 'Enter a phone number.').max(40),
  attribution: attributionSchema.optional(),
}).strict()

export type DemoRequestInput = z.infer<typeof demoRequestSchema>
export type AttributionInput = z.infer<typeof attributionSchema>

export const demoRequestFieldNames = ['name', 'academy', 'email', 'phone'] as const
