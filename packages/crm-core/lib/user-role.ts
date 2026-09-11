import { z } from 'zod'

export const userRoleSchema = z.enum(['ADMIN', 'STAFF', 'VIEWER'])
export type UserRole = z.infer<typeof userRoleSchema>
