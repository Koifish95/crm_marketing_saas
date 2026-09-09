import { z } from 'zod'

export const loginSchema = z.object({
  password: z.string().optional(),
  redirect: z.string().optional(),
  identifier: z.string().optional(),
  email: z.string().optional(),
}).transform((value) => {
  return {
    identifier: (value.identifier || value.email || '').trim(),
    password: value.password ?? '',
    redirect: value.redirect,
  }
})
