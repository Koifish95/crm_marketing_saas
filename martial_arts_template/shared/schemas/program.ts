import { z } from 'zod'

export const createProgramSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  active: z.boolean().default(true),
  seasonal: z.boolean().default(false),
})

export const updateProgramSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  active: z.boolean().optional(),
  seasonal: z.boolean().optional(),
})
