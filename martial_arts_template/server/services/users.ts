import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import { userRoleAssignments, users } from '../database/schema'
import type { UserRole } from '../../shared/schemas/enums'
import { USERNAME_PATTERN, normalizeUsername } from '../../shared/schemas/user'
import { normalizeEmail, TEMPORARY_PASSWORD_DEFAULT, isPermanentPasswordCompliant } from '../../shared/utils/password-policy'
import { utcNowMs } from '../../shared/utils/time'
import { userTypeForCoarseRole } from './access-rights'
import { bumpSessionVersion } from './auth'
import { DomainError } from './errors'
import { hashStaffPassword, verifyStaffPassword } from './password'

export interface PublicUser {
  id: number
  email: string
  username: string
  displayName: string
  role: UserRole
  userTypeId: number | null
  extraRoleIds: number[]
  active: boolean
  mustChangePassword: boolean
  lastLoginAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

function toPublicUser(row: typeof users.$inferSelect, extraRoleIds: number[] = []): PublicUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.displayName,
    role: row.role as UserRole,
    userTypeId: row.userTypeId ?? null,
    extraRoleIds,
    active: row.active,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function extraRoleIdsByUser(db: Database, userIds: number[]) {
  const map = new Map<number, number[]>()
  if (!userIds.length) {
    return map
  }
  const rows = await db.select().from(userRoleAssignments)
  for (const row of rows) {
    if (!userIds.includes(row.userId)) {
      continue
    }
    const current = map.get(row.userId) ?? []
    current.push(row.userRoleId)
    map.set(row.userId, current)
  }
  return map
}

export async function countActiveAdmins(db: Database, exceptUserId?: number) {
  const rows = await db.select({ id: users.id }).from(users).where(and(
    eq(users.role, 'ADMIN'),
    eq(users.active, true),
  ))
  return rows.filter(row => row.id !== exceptUserId).length
}

async function assertEmailAvailable(db: Database, email: string, exceptUserId?: number) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing && existing.id !== exceptUserId) {
    throw new DomainError('That email is already in use.', 409)
  }
}

async function assertUsernameAvailable(db: Database, username: string, exceptUserId?: number) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)
  if (existing && existing.id !== exceptUserId) {
    throw new DomainError('That username is already in use.', 409)
  }
}

function parseChosenUsername(raw: string | undefined) {
  if (raw == null) {
    return undefined
  }
  const username = normalizeUsername(raw)
  if (!username) {
    return undefined
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new DomainError('Use letters, numbers, periods, underscores, or hyphens.')
  }
  return username
}

async function uniqueUsername(db: Database, email: string, exceptUserId?: number) {
  const base = email.replace(/[^a-z0-9._-]/g, '').slice(0, 80) || 'user'
  let candidate = base
  let n = 1
  while (true) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1)
    if (!existing || existing.id === exceptUserId) {
      return candidate
    }
    n += 1
    candidate = `${base}-${n}`
  }
}

export async function listManagedUsers(
  db: Database,
  filters: { search?: string, role?: UserRole, active?: boolean } = {},
) {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt))
  const filtered = rows.filter((row) => {
    if (filters.role && row.role !== filters.role) {
      return false
    }
    if (filters.active != null && row.active !== filters.active) {
      return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${row.displayName} ${row.email} ${row.username}`.toLowerCase()
      if (!hay.includes(q)) {
        return false
      }
    }
    return true
  })
  const extra = await extraRoleIdsByUser(db, filtered.map(row => row.id))
  return filtered.map(row => toPublicUser(row, extra.get(row.id) ?? []))
}

export async function createManagedUser(
  db: Database,
  input: { displayName: string, email: string, role: UserRole, password?: string, username?: string },
) {
  const email = normalizeEmail(input.email)
  if (!email.includes('@')) {
    throw new DomainError('Enter a valid email address.')
  }
  await assertEmailAvailable(db, email)
  const chosen = parseChosenUsername(input.username)
  if (chosen) {
    await assertUsernameAvailable(db, chosen)
  }
  const username = chosen ?? await uniqueUsername(db, email)
  const password = input.password || TEMPORARY_PASSWORD_DEFAULT
  const now = new Date(utcNowMs())
  const passwordHash = await hashStaffPassword(password)
  const userType = await userTypeForCoarseRole(db, input.role)
  await db.insert(users).values({
    email,
    username,
    displayName: input.displayName.trim(),
    role: input.role,
    userTypeId: userType?.id ?? null,
    active: true,
    passwordHash,
    mustChangePassword: true,
    sessionVersion: 0,
    createdAt: now,
    updatedAt: now,
  })
  const [created] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return toPublicUser(created!)
}

export async function updateManagedUser(
  db: Database,
  userId: number,
  input: { displayName?: string, email?: string, username?: string },
) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    throw new DomainError('User not found.', 404)
  }
  const nextEmail = input.email != null ? normalizeEmail(input.email) : row.email
  if (input.email != null && !nextEmail.includes('@')) {
    throw new DomainError('Enter a valid email address.')
  }
  await assertEmailAvailable(db, nextEmail, userId)
  const chosenUsername = parseChosenUsername(input.username)
  const nextUsername = chosenUsername ?? row.username
  if (chosenUsername) {
    await assertUsernameAvailable(db, chosenUsername, userId)
  }
  const now = new Date(utcNowMs())
  await db.update(users).set({
    displayName: input.displayName?.trim() ?? row.displayName,
    email: nextEmail,
    username: nextUsername,
    updatedAt: now,
  }).where(eq(users.id, userId))
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}

export async function changeManagedUserRole(
  db: Database,
  actorId: number,
  userId: number,
  role: UserRole,
) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    throw new DomainError('User not found.', 404)
  }
  if (actorId === userId && row.role === 'ADMIN' && role !== 'ADMIN') {
    throw new DomainError('You cannot remove your own admin role.', 403)
  }
  if (row.role === 'ADMIN' && row.active && role !== 'ADMIN') {
    const remaining = await countActiveAdmins(db, userId)
    if (remaining < 1) {
      throw new DomainError('Cannot demote the last active admin.', 403)
    }
  }
  const now = new Date(utcNowMs())
  const userType = await userTypeForCoarseRole(db, role)
  await db.update(users).set({
    role,
    userTypeId: userType?.id ?? null,
    updatedAt: now,
  }).where(eq(users.id, userId))
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}

function rejectSelfPasswordAdmin(actorId: number, userId: number) {
  if (actorId === userId) {
    throw new DomainError('Use Change password for your own account.', 400)
  }
}

export async function resetManagedUserPassword(
  db: Database,
  actorId: number,
  userId: number,
  password: string,
) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    throw new DomainError('User not found.', 404)
  }
  rejectSelfPasswordAdmin(actorId, userId)
  if (!isPermanentPasswordCompliant(password)) {
    throw new DomainError('Password must be at least 8 characters and include an uppercase letter and a special character.')
  }
  const now = new Date(utcNowMs())
  await db.update(users).set({
    passwordHash: await hashStaffPassword(password),
    mustChangePassword: false,
    updatedAt: now,
  }).where(eq(users.id, userId))
  await bumpSessionVersion(db, userId)
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}

export async function requireManagedUserPasswordChange(
  db: Database,
  actorId: number,
  userId: number,
) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    throw new DomainError('User not found.', 404)
  }
  rejectSelfPasswordAdmin(actorId, userId)
  const now = new Date(utcNowMs())
  await db.update(users).set({
    mustChangePassword: true,
    updatedAt: now,
  }).where(eq(users.id, userId))
  await bumpSessionVersion(db, userId)
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}

export async function setManagedUserActive(
  db: Database,
  actorId: number,
  userId: number,
  active: boolean,
) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    throw new DomainError('User not found.', 404)
  }
  if (actorId === userId && !active) {
    throw new DomainError('You cannot deactivate your own account.', 403)
  }
  if (row.role === 'ADMIN' && row.active && !active) {
    const remaining = await countActiveAdmins(db, userId)
    if (remaining < 1) {
      throw new DomainError('Cannot deactivate the last active admin.', 403)
    }
  }
  const now = new Date(utcNowMs())
  await db.update(users).set({ active, updatedAt: now }).where(eq(users.id, userId))
  if (!active) {
    await bumpSessionVersion(db, userId)
  }
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}

export async function revokeManagedUserSessions(db: Database, userId: number) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    throw new DomainError('User not found.', 404)
  }
  await bumpSessionVersion(db, userId)
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}

export async function changeOwnPassword(
  db: Database,
  userId: number,
  currentPassword: string,
  newPassword: string,
) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row?.passwordHash) {
    throw new DomainError('User not found.', 404)
  }
  const matches = await verifyStaffPassword(row.passwordHash, currentPassword)
  if (!matches) {
    throw new DomainError('Current password is incorrect.', 400)
  }
  if (currentPassword === newPassword) {
    throw new DomainError('Choose a different password.')
  }
  if (!isPermanentPasswordCompliant(newPassword)) {
    throw new DomainError('Password must be at least 8 characters and include an uppercase letter and a special character.')
  }
  const now = new Date(utcNowMs())
  await db.update(users).set({
    passwordHash: await hashStaffPassword(newPassword),
    mustChangePassword: false,
    updatedAt: now,
  }).where(eq(users.id, userId))
  await bumpSessionVersion(db, userId)
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}

export async function changeOwnName(db: Database, userId: number, displayName: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    throw new DomainError('User not found.', 404)
  }
  const now = new Date(utcNowMs())
  await db.update(users).set({
    displayName: displayName.trim(),
    updatedAt: now,
  }).where(eq(users.id, userId))
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return toPublicUser(updated!)
}
