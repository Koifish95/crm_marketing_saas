import { eq, or } from 'drizzle-orm'
import type { Database } from '../database'
import { users } from '../database/schema'
import type { UserRole } from '../../shared/schemas/enums'
import { normalizeEmail } from '../../shared/utils/password-policy'
import { utcNowMs } from '../../shared/utils/time'
import { GENERIC_AUTH_FAILURE, type SessionUser } from './authorization'
import { hashStaffPassword, verifyStaffPassword } from './password'

export class AuthFailure extends Error {
  constructor(message = GENERIC_AUTH_FAILURE) {
    super(message)
    this.name = 'AuthFailure'
  }
}

export interface SessionCookieUser extends SessionUser {
  sessionVersion: number
}

export function toSessionUser(row: {
  id: number
  email: string
  displayName: string
  role: string
  mustChangePassword?: boolean
}): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role as UserRole,
    mustChangePassword: Boolean(row.mustChangePassword),
  }
}

export function toSessionCookieUser(row: {
  id: number
  email: string
  displayName: string
  role: string
  mustChangePassword?: boolean
  sessionVersion?: number
}): SessionCookieUser {
  return {
    ...toSessionUser(row),
    sessionVersion: row.sessionVersion ?? 0,
  }
}

export async function authenticateUser(
  db: Database,
  identifier: string,
  password: string,
): Promise<SessionCookieUser> {
  const normalized = normalizeEmail(identifier)
  const [row] = await db.select().from(users).where(or(
    eq(users.email, normalized),
    eq(users.username, normalized),
  )).limit(1)

  if (!row || !row.active || !row.passwordHash) {
    if (row?.passwordHash) {
      await verifyStaffPassword(row.passwordHash, password)
    }
    throw new AuthFailure()
  }

  const valid = await verifyStaffPassword(row.passwordHash, password)
  if (!valid) {
    throw new AuthFailure()
  }

  const now = new Date(utcNowMs())
  await db.update(users).set({
    lastLoginAt: now,
    updatedAt: now,
  }).where(eq(users.id, row.id))

  return toSessionCookieUser(row)
}

export async function loadActiveUser(db: Database, id: number): Promise<SessionCookieUser | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!row || !row.active) {
    return null
  }
  return toSessionCookieUser(row)
}

export async function hashForStorage(password: string): Promise<string> {
  return hashStaffPassword(password)
}

export async function bumpSessionVersion(db: Database, userId: number) {
  const [row] = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1)
  const next = (row?.sessionVersion ?? 0) + 1
  const now = new Date(utcNowMs())
  await db.update(users).set({
    sessionVersion: next,
    updatedAt: now,
  }).where(eq(users.id, userId))
  return next
}
