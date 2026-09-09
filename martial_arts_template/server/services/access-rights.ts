import { and, eq, inArray } from 'drizzle-orm'
import type { Database } from '../database'
import {
  userRoleAccessRights,
  userRoleAssignments,
  userRoles,
  userTypeRoles,
  userTypes,
  users,
} from '../database/schema'
import type { AccessRight, UserRole } from '../../shared/schemas/enums'
import {
  ACCESS_RIGHTS,
  SEEDED_USER_ROLE_RIGHTS,
  type SEEDED_USER_ROLE_CODES,
  type SEEDED_USER_TYPE_CODES,
} from '../../shared/utils/access-rights'
import { utcNowMs } from '../../shared/utils/time'
import { isAdmin, type SessionUser } from './authorization'
import { DomainError } from './errors'

async function countActiveAdmins(db: Database, exceptUserId?: number) {
  const rows = await db.select({ id: users.id }).from(users).where(and(
    eq(users.role, 'ADMIN'),
    eq(users.active, true),
  ))
  return rows.filter(row => row.id !== exceptUserId).length
}

const SEEDED_USER_TYPES: Array<{
  code: (typeof SEEDED_USER_TYPE_CODES)[number]
  name: string
  coarseRole: UserRole
  description: string
}> = [
  {
    code: 'ADMINISTRATOR',
    name: 'Administrator',
    coarseRole: 'ADMIN',
    description: 'Full application authority. Always includes every Access Right.',
  },
  {
    code: 'STAFF',
    name: 'Staff',
    coarseRole: 'STAFF',
    description: 'Acquisition CRM access. Marketing Access Rights are assigned separately.',
  },
  {
    code: 'VIEWER',
    name: 'Viewer',
    coarseRole: 'VIEWER',
    description: 'Dashboard and own account only.',
  },
]

const SEEDED_USER_ROLES: Array<{
  code: (typeof SEEDED_USER_ROLE_CODES)[number]
  name: string
  description: string
}> = [
  { code: 'MARKETING_VIEWER', name: 'Marketing viewer', description: 'See the Marketing area and reports.' },
  { code: 'CAMPAIGN_MANAGER', name: 'Campaign manager', description: 'Plan and update Marketing Campaigns.' },
  { code: 'MARKETING_TASK_MANAGER', name: 'Marketing task manager', description: 'Create and complete Marketing Tasks.' },
  { code: 'CONTENT_MANAGER', name: 'Content manager', description: 'Plan and record marketing content.' },
  { code: 'CONTENT_APPROVER', name: 'Content approver', description: 'Approve content when review is required.' },
  { code: 'ASSET_MANAGER', name: 'Asset manager', description: 'Upload and classify marketing assets.' },
  { code: 'EVENT_MANAGER', name: 'Event manager', description: 'Create Acquisition Events and Sessions.' },
  { code: 'EVENT_PROCESSOR', name: 'Event processor', description: 'Run the Event registration batch into Leads.' },
  { code: 'MARKETING_CONFIGURATOR', name: 'Marketing configurator', description: 'Change Marketing configuration.' },
  { code: 'COMPENSATION_ADMIN', name: 'Compensation admin', description: 'Assign and correct compensation credit.' },
]

export async function seedAccessCatalog(db: Database) {
  const now = new Date(utcNowMs())
  for (const type of SEEDED_USER_TYPES) {
    const [existing] = await db.select().from(userTypes).where(eq(userTypes.code, type.code)).limit(1)
    if (!existing) {
      await db.insert(userTypes).values({ ...type, createdAt: now, updatedAt: now })
    }
  }
  for (const role of SEEDED_USER_ROLES) {
    const [existing] = await db.select().from(userRoles).where(eq(userRoles.code, role.code)).limit(1)
    if (!existing) {
      await db.insert(userRoles).values({ ...role, createdAt: now, updatedAt: now })
    }
    const [saved] = await db.select().from(userRoles).where(eq(userRoles.code, role.code)).limit(1)
    if (!saved) {
      continue
    }
    const currentRights = await db.select().from(userRoleAccessRights).where(eq(userRoleAccessRights.userRoleId, saved.id))
    if (currentRights.length > 0) {
      continue
    }
    const rights = SEEDED_USER_ROLE_RIGHTS[role.code]
    for (const accessRight of rights) {
      await db.insert(userRoleAccessRights).values({
        userRoleId: saved.id,
        accessRight,
        createdAt: now,
      })
    }
  }

  const [administrator] = await db.select().from(userTypes).where(eq(userTypes.code, 'ADMINISTRATOR')).limit(1)
  if (administrator) {
    const existingTypeRoles = await db.select().from(userTypeRoles).where(eq(userTypeRoles.userTypeId, administrator.id))
    if (existingTypeRoles.length === 0) {
      const allRoles = await db.select().from(userRoles)
      for (const role of allRoles) {
        await db.insert(userTypeRoles).values({
          userTypeId: administrator.id,
          userRoleId: role.id,
          createdAt: now,
        })
      }
    }
  }

  const typeRows = await db.select().from(userTypes)
  const typeByRole = new Map(typeRows.map(row => [row.coarseRole, row]))
  const people = await db.select().from(users)
  for (const person of people) {
    if (person.userTypeId != null) {
      continue
    }
    const type = typeByRole.get(person.role)
    if (!type) {
      continue
    }
    await db.update(users).set({ userTypeId: type.id, updatedAt: now }).where(eq(users.id, person.id))
  }
}

export async function resolveEffectiveAccessRights(db: Database, user: { id: number, role: string, userTypeId?: number | null }): Promise<AccessRight[]> {
  if (isAdmin(user.role)) {
    return [...ACCESS_RIGHTS]
  }
  const roleIds = new Set<number>()
  if (user.userTypeId != null) {
    const typeRoles = await db.select().from(userTypeRoles).where(eq(userTypeRoles.userTypeId, user.userTypeId))
    for (const row of typeRoles) {
      roleIds.add(row.userRoleId)
    }
  }
  const extra = await db.select().from(userRoleAssignments).where(eq(userRoleAssignments.userId, user.id))
  for (const row of extra) {
    roleIds.add(row.userRoleId)
  }
  if (roleIds.size === 0) {
    return []
  }
  const grants = await db.select().from(userRoleAccessRights).where(inArray(userRoleAccessRights.userRoleId, [...roleIds]))
  const rights = new Set<AccessRight>()
  for (const grant of grants) {
    if (ACCESS_RIGHTS.includes(grant.accessRight as AccessRight)) {
      rights.add(grant.accessRight as AccessRight)
    }
  }
  return ACCESS_RIGHTS.filter(right => rights.has(right))
}

export async function resolveEffectiveAccessRightsForUserId(db: Database, userId: number): Promise<AccessRight[]> {
  const [row] = await db.select({
    id: users.id,
    role: users.role,
    userTypeId: users.userTypeId,
  }).from(users).where(eq(users.id, userId)).limit(1)
  if (!row) {
    return []
  }
  return resolveEffectiveAccessRights(db, row)
}

export function userHasAccessRight(rights: readonly AccessRight[], needed: AccessRight) {
  return rights.includes(needed)
}

export async function listAccessCatalog(db: Database) {
  const types = await db.select().from(userTypes)
  const roles = await db.select().from(userRoles)
  const typeRoles = await db.select().from(userTypeRoles)
  const grants = await db.select().from(userRoleAccessRights)
  return {
    accessRights: ACCESS_RIGHTS,
    userTypes: types.map(type => ({
      ...type,
      userRoleIds: typeRoles.filter(row => row.userTypeId === type.id).map(row => row.userRoleId),
    })),
    userRoles: roles.map(role => ({
      ...role,
      accessRights: grants.filter(row => row.userRoleId === role.id).map(row => row.accessRight as AccessRight),
    })),
  }
}

export async function replaceUserTypeRoles(
  db: Database,
  userTypeId: number,
  userRoleIds: number[],
) {
  const [type] = await db.select().from(userTypes).where(eq(userTypes.id, userTypeId)).limit(1)
  if (!type) {
    throw new DomainError('User Type not found.', 404)
  }
  const uniqueIds = [...new Set(userRoleIds)]
  if (uniqueIds.length) {
    const found = await db.select({ id: userRoles.id }).from(userRoles).where(inArray(userRoles.id, uniqueIds))
    if (found.length !== uniqueIds.length) {
      throw new DomainError('One or more User Roles were not found.')
    }
  }
  const now = new Date(utcNowMs())
  await db.delete(userTypeRoles).where(eq(userTypeRoles.userTypeId, userTypeId))
  for (const userRoleId of uniqueIds) {
    await db.insert(userTypeRoles).values({
      userTypeId,
      userRoleId,
      createdAt: now,
    })
  }
  return listAccessCatalog(db)
}

export async function replaceUserRoleRights(
  db: Database,
  userRoleId: number,
  rights: AccessRight[],
) {
  const [role] = await db.select().from(userRoles).where(eq(userRoles.id, userRoleId)).limit(1)
  if (!role) {
    throw new DomainError('User Role not found.', 404)
  }
  const uniqueRights = [...new Set(rights)]
  for (const right of uniqueRights) {
    if (!ACCESS_RIGHTS.includes(right)) {
      throw new DomainError('Unknown Access Right.')
    }
  }
  const now = new Date(utcNowMs())
  await db.delete(userRoleAccessRights).where(eq(userRoleAccessRights.userRoleId, userRoleId))
  for (const accessRight of uniqueRights) {
    await db.insert(userRoleAccessRights).values({
      userRoleId,
      accessRight,
      createdAt: now,
    })
  }
  return listAccessCatalog(db)
}

export async function userTypeForCoarseRole(db: Database, role: UserRole) {
  const code = role === 'ADMIN' ? 'ADMINISTRATOR' : role
  const [type] = await db.select().from(userTypes).where(eq(userTypes.code, code)).limit(1)
  return type ?? null
}

export async function assignUserType(
  db: Database,
  actor: SessionUser,
  userId: number,
  userTypeId: number,
) {
  const [person] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!person) {
    throw new DomainError('User not found.', 404)
  }
  const [type] = await db.select().from(userTypes).where(eq(userTypes.id, userTypeId)).limit(1)
  if (!type) {
    throw new DomainError('User Type not found.', 404)
  }
  const nextRole = type.coarseRole as UserRole
  if (actor.id === userId && person.role === 'ADMIN' && nextRole !== 'ADMIN') {
    throw new DomainError('You cannot remove your own admin role.', 403)
  }
  if (person.role === 'ADMIN' && person.active && nextRole !== 'ADMIN') {
    const remaining = await countActiveAdmins(db, userId)
    if (remaining < 1) {
      throw new DomainError('Cannot demote the last active admin.', 403)
    }
  }
  const now = new Date(utcNowMs())
  await db.update(users).set({
    userTypeId: type.id,
    role: nextRole,
    updatedAt: now,
  }).where(eq(users.id, userId))
  const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return updated!
}

export async function assignExtraUserRoles(
  db: Database,
  actor: SessionUser,
  userId: number,
  userRoleIds: number[],
) {
  const [person] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!person) {
    throw new DomainError('User not found.', 404)
  }
  const uniqueIds = [...new Set(userRoleIds)]
  if (uniqueIds.length) {
    const found = await db.select({ id: userRoles.id }).from(userRoles).where(inArray(userRoles.id, uniqueIds))
    if (found.length !== uniqueIds.length) {
      throw new DomainError('One or more User Roles were not found.')
    }
  }
  const now = new Date(utcNowMs())
  await db.delete(userRoleAssignments).where(eq(userRoleAssignments.userId, userId))
  for (const userRoleId of uniqueIds) {
    await db.insert(userRoleAssignments).values({
      userId,
      userRoleId,
      createdByUserId: actor.id,
      createdAt: now,
    })
  }
  return listAssignedRolesForUser(db, userId)
}

export async function listAssignedRolesForUser(db: Database, userId: number) {
  const rows = await db.select().from(userRoleAssignments).where(eq(userRoleAssignments.userId, userId))
  if (!rows.length) {
    return []
  }
  const roles = await db.select().from(userRoles).where(inArray(userRoles.id, rows.map(row => row.userRoleId)))
  return roles
}

export async function presentManagedUserAccess(db: Database, userId: number, userTypeId: number | null) {
  const extraRoles = await listAssignedRolesForUser(db, userId)
  const accessRights = await resolveEffectiveAccessRightsForUserId(db, userId)
  let userType = null
  if (userTypeId != null) {
    const [row] = await db.select().from(userTypes).where(eq(userTypes.id, userTypeId)).limit(1)
    userType = row ?? null
  }
  return {
    userType,
    extraRoleIds: extraRoles.map(role => role.id),
    extraRoles,
    accessRights,
  }
}
