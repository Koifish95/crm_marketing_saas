import { registerAccessRights } from '@crm/core/shared/utils/permission-catalog'

export const ACCESS_RIGHTS = ['VIEW_SALES', 'MANAGE_SALES'] as const
export type AccessRight = (typeof ACCESS_RIGHTS)[number]

export const ACCESS_RIGHT_LABELS: Record<AccessRight, string> = {
  VIEW_SALES: 'View Sales',
  MANAGE_SALES: 'Manage Sales',
}

export const ACCESS_RIGHT_DESCRIPTIONS: Record<AccessRight, string> = {
  VIEW_SALES: 'Open Companies, Contacts, Opportunities, and Activities.',
  MANAGE_SALES: 'Create and update Sales records, including pipeline and activities.',
}

export const SEEDED_USER_ROLES = [
  { code: 'SALES_USER', name: 'Sales user', description: 'Work Companies, Contacts, Opportunities, and Activities.' },
] as const

export const SEEDED_USER_ROLE_RIGHTS: Record<string, readonly AccessRight[]> = {
  SALES_USER: ['VIEW_SALES', 'MANAGE_SALES'],
}

registerAccessRights(ACCESS_RIGHTS.map(code => ({
  code,
  label: ACCESS_RIGHT_LABELS[code],
  description: ACCESS_RIGHT_DESCRIPTIONS[code],
})))
