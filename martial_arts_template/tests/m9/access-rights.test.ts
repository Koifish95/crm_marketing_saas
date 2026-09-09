import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { userRoles, userTypeRoles, userTypes, users } from '../../server/database/schema'
import {
  assignExtraUserRoles,
  assignUserType,
  replaceUserRoleRights,
  replaceUserTypeRoles,
  resolveEffectiveAccessRights,
  resolveEffectiveAccessRightsForUserId,
} from '../../server/services/access-rights'
import { createManagedUser } from '../../server/services/users'
import { ACCESS_RIGHTS } from '../../shared/utils/access-rights'
import { openTestDatabase } from '../helpers/db'

describe('M9 access rights', () => {
  it('seeds User Types and Roles and grants ADMIN every Access Right', async () => {
    const testDb = await openTestDatabase()
    try {
      const types = await testDb.db.select().from(userTypes)
      expect(types.map(row => row.code).sort()).toEqual(['ADMINISTRATOR', 'STAFF', 'VIEWER'])
      const roles = await testDb.db.select().from(userRoles)
      expect(roles.length).toBeGreaterThanOrEqual(10)
      const [admin] = await testDb.db.select().from(users)
      expect(admin?.role).toBe('ADMIN')
      expect(admin?.userTypeId).toBeTruthy()
      const rights = await resolveEffectiveAccessRightsForUserId(testDb.db, admin!.id)
      expect(rights).toEqual([...ACCESS_RIGHTS])
    } finally {
      await testDb.close()
    }
  })

  it('does not grant STAFF marketing Access Rights by default', async () => {
    const testDb = await openTestDatabase()
    try {
      const staff = await createManagedUser(testDb.db, {
        displayName: 'Pat Staff',
        email: 'pat.staff@example.com',
        role: 'STAFF',
      })
      expect(staff.userTypeId).toBeTruthy()
      const rights = await resolveEffectiveAccessRightsForUserId(testDb.db, staff.id)
      expect(rights).toEqual([])
    } finally {
      await testDb.close()
    }
  })

  it('unions User Type roles with extra User Roles', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const staff = await createManagedUser(testDb.db, {
        displayName: 'Marta',
        email: 'marta@example.com',
        role: 'STAFF',
      })
      const [viewerRole] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'MARKETING_VIEWER'))
      const [campaignRole] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'CAMPAIGN_MANAGER'))
      const [staffType] = await testDb.db.select().from(userTypes).where(eq(userTypes.code, 'STAFF'))
      await replaceUserTypeRoles(testDb.db, staffType!.id, [viewerRole!.id])
      await assignExtraUserRoles(testDb.db, {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN',
        mustChangePassword: false,
      }, staff.id, [campaignRole!.id])
      const rights = await resolveEffectiveAccessRightsForUserId(testDb.db, staff.id)
      expect(rights).toEqual(['VIEW_MARKETING', 'MANAGE_CAMPAIGNS', 'VIEW_MARKETING_REPORTS'])
    } finally {
      await testDb.close()
    }
  })

  it('keeps ADMIN rights even if Administrator type has no roles', async () => {
    const testDb = await openTestDatabase()
    try {
      const [adminType] = await testDb.db.select().from(userTypes).where(eq(userTypes.code, 'ADMINISTRATOR'))
      await testDb.db.delete(userTypeRoles).where(eq(userTypeRoles.userTypeId, adminType!.id))
      const [admin] = await testDb.db.select().from(users)
      const rights = await resolveEffectiveAccessRights(testDb.db, admin!)
      expect(rights).toEqual([...ACCESS_RIGHTS])
    } finally {
      await testDb.close()
    }
  })

  it('blocks assigning a non-admin User Type to the last active admin', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const [staffType] = await testDb.db.select().from(userTypes).where(eq(userTypes.code, 'STAFF'))
      await expect(assignUserType(testDb.db, {
        id: admin!.id,
        email: admin!.email,
        displayName: admin!.displayName,
        role: 'ADMIN',
        mustChangePassword: false,
      }, admin!.id, staffType!.id)).rejects.toMatchObject({ statusCode: 403 })
    } finally {
      await testDb.close()
    }
  })

  it('rejects unknown Access Right keys on a User Role', async () => {
    const testDb = await openTestDatabase()
    try {
      const [role] = await testDb.db.select().from(userRoles).where(eq(userRoles.code, 'MARKETING_VIEWER'))
      await expect(replaceUserRoleRights(testDb.db, role!.id, ['VIEW_MARKETING', 'NOT_A_RIGHT' as 'VIEW_MARKETING']))
        .rejects.toMatchObject({ message: 'Unknown Access Right.' })
    } finally {
      await testDb.close()
    }
  })

  it('VIEWER remains without marketing rights', async () => {
    const testDb = await openTestDatabase()
    try {
      const viewer = await createManagedUser(testDb.db, {
        displayName: 'View Only',
        email: 'viewer@example.com',
        role: 'VIEWER',
      })
      const rights = await resolveEffectiveAccessRightsForUserId(testDb.db, viewer.id)
      expect(rights).toEqual([])
    } finally {
      await testDb.close()
    }
  })
})
