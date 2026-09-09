import { z } from 'zod'
import { userRoleSchema } from './enums'
import { TEMPORARY_PASSWORD_DEFAULT } from '../utils/password-policy'

export const USERNAME_PATTERN = /^[a-z0-9._-]{1,80}$/

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase()
}

const optionalUsernameSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = normalizeUsername(value)
  return normalized === '' ? undefined : normalized
}, z.string().regex(USERNAME_PATTERN, 'Use letters, numbers, periods, underscores, or hyphens.').optional())

export const createUserSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().min(3).max(200),
  username: optionalUsernameSchema,
  role: userRoleSchema,
  password: z.string().min(1).max(200).optional(),
})

export const patchUserSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().min(3).max(200).optional(),
  username: optionalUsernameSchema,
}).refine(value => value.displayName !== undefined || value.email !== undefined || value.username !== undefined, {
  message: 'No changes provided.',
})

export const changeRoleSchema = z.object({
  role: userRoleSchema,
})

export const resetPasswordSchema = z.object({
  password: z.string().min(1).max(200),
})

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
})

export const changeOwnNameSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
})

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  role: userRoleSchema.optional(),
  active: z.enum(['true', 'false']).optional(),
})

export const listSecurityEventsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  action: z.string().trim().max(80).optional(),
  result: z.enum(['SUCCESS', 'FAILURE', 'DENIED']).optional(),
})

export const DEFAULT_TEMPORARY_PASSWORD = TEMPORARY_PASSWORD_DEFAULT
