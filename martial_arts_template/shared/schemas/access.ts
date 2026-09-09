import { z } from 'zod'
import { accessRightSchema } from './enums'

export const assignUserTypeSchema = z.object({
  userTypeId: z.number().int().positive(),
})

export const assignUserRolesSchema = z.object({
  userRoleIds: z.array(z.number().int().positive()).max(50),
})

export const replaceUserTypeRolesSchema = z.object({
  userRoleIds: z.array(z.number().int().positive()).max(50),
})

export const replaceUserRoleRightsSchema = z.object({
  accessRights: z.array(accessRightSchema).max(50),
})
