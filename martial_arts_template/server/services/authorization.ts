import type { UserRole } from '../../shared/schemas/enums'

export interface SessionUser {
  id: number
  email: string
  displayName: string
  role: UserRole
  mustChangePassword: boolean
}

export const WRITE_ROLES: readonly UserRole[] = ['ADMIN', 'STAFF']
export const ADMIN_ROLES: readonly UserRole[] = ['ADMIN']
export const ALL_ROLES: readonly UserRole[] = ['ADMIN', 'STAFF', 'VIEWER']
export const CRM_ACCESS_ROLES: readonly UserRole[] = ['ADMIN', 'STAFF']

export function canWriteCrm(role: string): boolean {
  return WRITE_ROLES.includes(role as UserRole)
}

export function canAccessCrm(role: string): boolean {
  return CRM_ACCESS_ROLES.includes(role as UserRole)
}

export function isAdmin(role: string): boolean {
  return role === 'ADMIN'
}

export function hasRole(role: string, allowed: readonly UserRole[]): boolean {
  return allowed.includes(role as UserRole)
}

export function hasAccessRight(rights: readonly string[] | undefined, needed: string) {
  return Boolean(rights?.includes(needed))
}

export const GENERIC_AUTH_FAILURE = 'Invalid email or password.'
export const FORBIDDEN_MESSAGE = 'Forbidden'
export const UNAUTHORIZED_MESSAGE = 'Unauthorized'
export const PASSWORD_CHANGE_REQUIRED_MESSAGE = 'Password change required.'

export const PUBLIC_PAGE_PATHS = ['/', '/login', '/trial']
export const PUBLIC_PATH_PREFIXES = ['/api/health', '/api/auth/login', '/api/_auth/session', '/api/public']

export function isPublicPagePrefix(pathname: string) {
  return pathname === '/events' || pathname.startsWith('/events/')
    || pathname === '/t' || pathname.startsWith('/t/')
}

export const PASSWORD_CHANGE_PAGE_PATHS = ['/account/password']
export const PASSWORD_CHANGE_API_PATHS = [
  '/api/auth/me',
  '/api/auth/logout',
  '/api/auth/password',
  '/api/_auth/session',
]

export function isPublicPath(path: string): boolean {
  const pathname = path.split('?')[0] ?? path
  if (PUBLIC_PAGE_PATHS.includes(pathname) || isPublicPagePrefix(pathname)) {
    return true
  }
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isPasswordChangeAllowedPath(path: string): boolean {
  const pathname = path.split('?')[0] ?? path
  if (PASSWORD_CHANGE_PAGE_PATHS.includes(pathname)) {
    return true
  }
  return PASSWORD_CHANGE_API_PATHS.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function safeInternalRedirect(target: unknown): string {
  if (typeof target !== 'string') {
    return '/dashboard'
  }
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/login')) {
    return '/dashboard'
  }
  return target
}

export function postLoginRedirect(user: { mustChangePassword: boolean }, requested?: unknown): string {
  if (user.mustChangePassword) {
    return '/account/password'
  }
  return safeInternalRedirect(requested)
}
