import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { authenticateUser, AuthFailure, loadActiveUser, toSessionUser } from '../../server/services/auth'
import { canWriteCrm, canAccessCrm, hasRole, isAdmin, isPublicPath, postLoginRedirect, safeInternalRedirect } from '../../server/services/authorization'
import { hashStaffPassword, isScryptPasswordHash, verifyStaffPassword } from '../../server/services/password'
import { users } from '../../server/database/schema'
import { utcNowMs } from '../../shared/utils/time'
import { openTestDatabase, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_ADMIN_USERNAME } from '../helpers/db'

describe('M2 authentication', () => {
  it('stores a scrypt hash and authenticates the seeded admin', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      expect(admin?.email).toBe(TEST_ADMIN_EMAIL)
      expect(admin?.username).toBe(TEST_ADMIN_USERNAME)
      expect(isScryptPasswordHash(admin?.passwordHash)).toBe(true)
      expect(admin?.passwordHash).not.toBe(TEST_ADMIN_PASSWORD)
      expect(await verifyStaffPassword(admin!.passwordHash!, TEST_ADMIN_PASSWORD)).toBe(true)

      const sessionUser = await authenticateUser(testDb.db, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
      expect(sessionUser).toEqual({
        id: admin!.id,
        email: TEST_ADMIN_EMAIL,
        displayName: 'Admin',
        role: 'ADMIN',
        mustChangePassword: false,
        sessionVersion: 0,
      })
      expect('passwordHash' in sessionUser).toBe(false)
      const byUsername = await authenticateUser(testDb.db, TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD)
      expect(byUsername.id).toBe(admin!.id)
      const [afterLogin] = await testDb.db.select().from(users)
      expect(afterLogin?.lastLoginAt).toBeInstanceOf(Date)
    } finally {
      await testDb.close()
    }
  })

  it('rejects invalid passwords and unknown emails with the same failure type', async () => {
    const testDb = await openTestDatabase()
    try {
      await expect(authenticateUser(testDb.db, TEST_ADMIN_EMAIL, 'wrong-password')).rejects.toBeInstanceOf(AuthFailure)
      await expect(authenticateUser(testDb.db, 'nobody@example.com', TEST_ADMIN_PASSWORD)).rejects.toBeInstanceOf(AuthFailure)

      try {
        await authenticateUser(testDb.db, TEST_ADMIN_EMAIL, 'wrong-password')
      } catch (error) {
        expect((error as Error).message).toBe('Invalid email or password.')
      }
      try {
        await authenticateUser(testDb.db, 'nobody@example.com', TEST_ADMIN_PASSWORD)
      } catch (error) {
        expect((error as Error).message).toBe('Invalid email or password.')
      }
    } finally {
      await testDb.close()
    }
  })

  it('does not authenticate inactive users even with the correct password', async () => {
    const testDb = await openTestDatabase()
    try {
      await testDb.db.update(users).set({
        active: false,
        updatedAt: new Date(utcNowMs()),
      }).where(eq(users.email, TEST_ADMIN_EMAIL))

      await expect(authenticateUser(testDb.db, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)).rejects.toBeInstanceOf(AuthFailure)

      const [admin] = await testDb.db.select().from(users)
      expect(await loadActiveUser(testDb.db, admin!.id)).toBeNull()
    } finally {
      await testDb.close()
    }
  })
})

describe('M2 authorization', () => {
  it('allows ADMIN and STAFF writes and rejects VIEWER', () => {
    expect(canAccessCrm('ADMIN')).toBe(true)
    expect(canAccessCrm('STAFF')).toBe(true)
    expect(canAccessCrm('VIEWER')).toBe(false)
    expect(canWriteCrm('ADMIN')).toBe(true)
    expect(canWriteCrm('STAFF')).toBe(true)
    expect(canWriteCrm('VIEWER')).toBe(false)
    expect(hasRole('VIEWER', ['ADMIN'])).toBe(false)
    expect(hasRole('ADMIN', ['ADMIN'])).toBe(true)
    expect(isAdmin('ADMIN')).toBe(true)
    expect(isAdmin('STAFF')).toBe(false)
  })

  it('keeps public routes public and treats internal paths as protected', () => {
    expect(isPublicPath('/')).toBe(true)
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/api/health')).toBe(true)
    expect(isPublicPath('/api/auth/login')).toBe(true)
    expect(isPublicPath('/trial')).toBe(true)
    expect(isPublicPath('/events/kids-open-house')).toBe(true)
    expect(isPublicPath('/t/september-campaign')).toBe(true)
    expect(isPublicPath('/api/public/tracking/september-campaign')).toBe(true)
    expect(isPublicPath('/api/public/availability')).toBe(true)
    expect(isPublicPath('/dashboard')).toBe(false)
    expect(isPublicPath('/leads')).toBe(false)
    expect(isPublicPath('/api/auth/me')).toBe(false)
  })

  it('sanitizes post-login redirects', () => {
    expect(safeInternalRedirect('/dashboard')).toBe('/dashboard')
    expect(safeInternalRedirect('/leads/1')).toBe('/leads/1')
    expect(safeInternalRedirect('https://evil.example')).toBe('/dashboard')
    expect(safeInternalRedirect('//evil.example')).toBe('/dashboard')
    expect(safeInternalRedirect('/login')).toBe('/dashboard')
    expect(postLoginRedirect({ mustChangePassword: true }, '/leads')).toBe('/account/password')
    expect(postLoginRedirect({ mustChangePassword: false }, '/leads')).toBe('/leads')
  })

  it('omits password hashes from session users', () => {
    expect(toSessionUser({
      id: 1,
      email: 'staff@example.com',
      displayName: 'Staff',
      role: 'STAFF',
    })).toEqual({
      id: 1,
      email: 'staff@example.com',
      displayName: 'Staff',
      role: 'STAFF',
      mustChangePassword: false,
    })
  })

  it('authenticates a VIEWER without granting write access', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      const passwordHash = await hashStaffPassword('viewer-password')
      await testDb.db.insert(users).values({
        email: 'viewer@example.com',
        username: 'viewer',
        displayName: 'Viewer',
        role: 'VIEWER',
        active: true,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      })

      const sessionUser = await authenticateUser(testDb.db, 'viewer@example.com', 'viewer-password')
      expect(sessionUser.role).toBe('VIEWER')
      expect(sessionUser.mustChangePassword).toBe(false)
      expect(canWriteCrm(sessionUser.role)).toBe(false)
    } finally {
      await testDb.close()
    }
  })
})
