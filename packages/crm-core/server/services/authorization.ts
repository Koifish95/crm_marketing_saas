import type { UserRole } from '../../lib/user-role'

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

const publicPages = new Set(['/', '/login'])
const publicPrefixes = new Set(['/api/health', '/api/auth/login', '/api/_auth/session'])
const publicMatchers = new Map<string, (pathname: string) => boolean>()

export function registerPublicPaths(input: {
  pages?: readonly string[]
  prefixes?: readonly string[]
  matchers?: Readonly<Record<string, (pathname: string) => boolean>>
}) {
  for (const page of input.pages ?? []) {
    publicPages.add(page)
  }
  for (const prefix of input.prefixes ?? []) {
    publicPrefixes.add(prefix)
  }
  for (const [id, matcher] of Object.entries(input.matchers ?? {})) {
    publicMatchers.set(id, matcher)
  }
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
  if (publicPages.has(pathname)) {
    return true
  }
  for (const matcher of publicMatchers.values()) {
    if (matcher(pathname)) {
      return true
    }
  }
  return [...publicPrefixes].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
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
