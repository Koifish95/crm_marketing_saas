import type { UserRole } from './user-role'

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  VIEWER: 'Viewer',
}

export function roleLabel(role: string) {
  return ROLE_LABELS[role as UserRole] ?? role
}
