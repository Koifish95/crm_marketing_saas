import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { users } from '../../server/database/schema'
import { authenticateUser, AuthFailure, loadActiveUser } from '../../server/services/auth'
import { isScryptPasswordHash, verifyStaffPassword } from '../../server/services/password'
import { recordSecurityEvent, listSecurityEvents } from '../../server/services/security-audit'
import {
  changeManagedUserRole,
  changeOwnPassword,
  createManagedUser,
  listManagedUsers,
  resetManagedUserPassword,
  requireManagedUserPasswordChange,
  revokeManagedUserSessions,
  setManagedUserActive,
  updateManagedUser,
} from '../../server/services/users'
import { TEMPORARY_PASSWORD_DEFAULT } from '../../shared/utils/password-policy'
import { openTestDatabase } from '../helpers/db'

describe('M7 user administration', () => {
  it('creates a user with a hashed temporary password and mustChangePassword', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createManagedUser(testDb.db, {
        displayName: 'Pat Staff',
        email: '  Pat.Staff@Example.com ',
        role: 'STAFF',
      })
      expect(created.email).toBe('pat.staff@example.com')
      expect(created.username).toBe('pat.staffexample.com')
      expect(created.mustChangePassword).toBe(true)
      expect(created.active).toBe(true)
      expect('passwordHash' in created).toBe(false)

      const [row] = await testDb.db.select().from(users).where(eq(users.id, created.id))
      expect(isScryptPasswordHash(row?.passwordHash)).toBe(true)
      expect(row?.passwordHash).not.toContain(TEMPORARY_PASSWORD_DEFAULT)
      expect(await verifyStaffPassword(row!.passwordHash!, TEMPORARY_PASSWORD_DEFAULT)).toBe(true)

      const listed = await listManagedUsers(testDb.db, { search: 'pat.staffexample.com' })
      expect(listed.some(user => user.id === created.id && user.username === 'pat.staffexample.com')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('rejects duplicate emails including inactive accounts', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const created = await createManagedUser(testDb.db, {
        displayName: 'Temp',
        email: 'temp@example.com',
        role: 'STAFF',
      })
      await setManagedUserActive(testDb.db, admin!.id, created.id, false)
      await expect(createManagedUser(testDb.db, {
        displayName: 'Other',
        email: 'temp@example.com',
        role: 'VIEWER',
      })).rejects.toMatchObject({ statusCode: 409 })
    } finally {
      await testDb.close()
    }
  })

  it('blocks self-deactivation, last-admin deactivation, and last-admin demotion', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      await expect(setManagedUserActive(testDb.db, admin!.id, admin!.id, false)).rejects.toMatchObject({ statusCode: 403 })
      await expect(changeManagedUserRole(testDb.db, admin!.id, admin!.id, 'STAFF')).rejects.toMatchObject({ statusCode: 403 })
      await expect(setManagedUserActive(testDb.db, admin!.id, admin!.id, false)).rejects.toMatchObject({ statusCode: 403 })
    } finally {
      await testDb.close()
    }
  })

  it('sets an admin-chosen password without forcing another change', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const created = await createManagedUser(testDb.db, {
        displayName: 'Reset Me',
        email: 'reset.me@example.com',
        role: 'STAFF',
        password: 'TempPass1!',
      })
      await changeOwnPassword(testDb.db, created.id, 'TempPass1!', 'Permanent1!')
      const before = await loadActiveUser(testDb.db, created.id)
      expect(before?.mustChangePassword).toBe(false)

      const reset = await resetManagedUserPassword(testDb.db, admin!.id, created.id, 'AdminSet1!')
      expect(reset.mustChangePassword).toBe(false)
      const after = await loadActiveUser(testDb.db, created.id)
      expect(after?.sessionVersion).toBeGreaterThan(before?.sessionVersion ?? 0)
      await expect(authenticateUser(testDb.db, 'reset.me@example.com', 'Permanent1!')).rejects.toBeInstanceOf(AuthFailure)
      const session = await authenticateUser(testDb.db, 'reset.me@example.com', 'AdminSet1!')
      expect(session.mustChangePassword).toBe(false)
    } finally {
      await testDb.close()
    }
  })

  it('requires a password change on next login without replacing the current password', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const created = await createManagedUser(testDb.db, {
        displayName: 'Force Change',
        email: 'force.change@example.com',
        role: 'STAFF',
        password: 'TempPass1!',
      })
      await changeOwnPassword(testDb.db, created.id, 'TempPass1!', 'Permanent1!')
      const before = await loadActiveUser(testDb.db, created.id)
      expect(before?.mustChangePassword).toBe(false)

      const required = await requireManagedUserPasswordChange(testDb.db, admin!.id, created.id)
      expect(required.mustChangePassword).toBe(true)
      const after = await loadActiveUser(testDb.db, created.id)
      expect(after?.sessionVersion).toBeGreaterThan(before?.sessionVersion ?? 0)
      const session = await authenticateUser(testDb.db, 'force.change@example.com', 'Permanent1!')
      expect(session.mustChangePassword).toBe(true)
      await expect(resetManagedUserPassword(testDb.db, admin!.id, created.id, 'noupper1!'))
        .rejects.toThrow('uppercase')
      await expect(requireManagedUserPasswordChange(testDb.db, admin!.id, admin!.id))
        .rejects.toMatchObject({ statusCode: 400 })
    } finally {
      await testDb.close()
    }
  })

  it('revokes sessions independently of password reset', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createManagedUser(testDb.db, {
        displayName: 'Revoke Me',
        email: 'revoke.me@example.com',
        role: 'STAFF',
      })
      const before = await loadActiveUser(testDb.db, created.id)
      await revokeManagedUserSessions(testDb.db, created.id)
      const after = await loadActiveUser(testDb.db, created.id)
      expect(after?.sessionVersion).toBe((before?.sessionVersion ?? 0) + 1)
    } finally {
      await testDb.close()
    }
  })

  it('rejects current-password reuse and weak permanent passwords', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createManagedUser(testDb.db, {
        displayName: 'Weak',
        email: 'weak@example.com',
        role: 'VIEWER',
      })
      await expect(changeOwnPassword(testDb.db, created.id, TEMPORARY_PASSWORD_DEFAULT, TEMPORARY_PASSWORD_DEFAULT))
        .rejects.toThrow('Choose a different password')
      await expect(changeOwnPassword(testDb.db, created.id, TEMPORARY_PASSWORD_DEFAULT, 'noupper1!'))
        .rejects.toThrow('uppercase')
      await expect(changeOwnPassword(testDb.db, created.id, 'wrong-current', 'ValidPass1!'))
        .rejects.toThrow('Current password is incorrect')
    } finally {
      await testDb.close()
    }
  })

  it('accepts a chosen username, rejects duplicates, and keeps auto-assign when blank', async () => {
    const testDb = await openTestDatabase()
    try {
      const auto = await createManagedUser(testDb.db, {
        displayName: 'Auto Name',
        email: 'auto.name@example.com',
        role: 'STAFF',
      })
      expect(auto.username).toBe('auto.nameexample.com')

      const chosen = await createManagedUser(testDb.db, {
        displayName: 'Chosen Name',
        email: 'chosen.name@example.com',
        username: '  Marta.R ',
        role: 'STAFF',
      })
      expect(chosen.username).toBe('marta.r')
      const session = await authenticateUser(testDb.db, 'marta.r', TEMPORARY_PASSWORD_DEFAULT)
      expect(session.id).toBe(chosen.id)

      await expect(createManagedUser(testDb.db, {
        displayName: 'Taken',
        email: 'taken@example.com',
        username: 'marta.r',
        role: 'VIEWER',
      })).rejects.toMatchObject({ statusCode: 409 })

      const renamed = await updateManagedUser(testDb.db, chosen.id, { username: 'pedro.r' })
      expect(renamed.username).toBe('pedro.r')
      expect(renamed.email).toBe('chosen.name@example.com')
      await expect(authenticateUser(testDb.db, 'marta.r', TEMPORARY_PASSWORD_DEFAULT)).rejects.toBeInstanceOf(AuthFailure)
      const renamedSession = await authenticateUser(testDb.db, 'pedro.r', TEMPORARY_PASSWORD_DEFAULT)
      expect(renamedSession.id).toBe(chosen.id)

      await expect(updateManagedUser(testDb.db, chosen.id, { username: 'auto.nameexample.com' }))
        .rejects.toMatchObject({ statusCode: 409 })
    } finally {
      await testDb.close()
    }
  })

  it('edits name and email without exposing hashes and records audit events without secrets', async () => {
    const testDb = await openTestDatabase()
    try {
      const created = await createManagedUser(testDb.db, {
        displayName: 'Edit Me',
        email: 'edit.me@example.com',
        role: 'STAFF',
      })
      const updated = await updateManagedUser(testDb.db, created.id, {
        displayName: 'Edited Name',
        email: 'edited@example.com',
      })
      expect(updated.displayName).toBe('Edited Name')
      expect(updated.email).toBe('edited@example.com')
      expect(updated.username).toBe(created.username)
      expect(JSON.stringify(updated)).not.toMatch(/passwordHash|scrypt|Change1!/)

      await recordSecurityEvent(testDb.db, {
        action: 'USER_EDITED',
        result: 'SUCCESS',
        actorUserId: created.id,
        targetUserId: created.id,
        metadata: { password: 'SECRET', note: 'safe' },
      })
      const events = await listSecurityEvents(testDb.db)
      const edited = events.find(event => event.action === 'USER_EDITED')
      expect(edited?.metadata?.note).toBe('safe')
      expect(JSON.stringify(edited)).not.toContain('SECRET')
      expect(JSON.stringify(edited)).not.toMatch(/passwordHash|Change1!/)
    } finally {
      await testDb.close()
    }
  })

  it('bumps session version on deactivation so old cookies cannot be reused', async () => {
    const testDb = await openTestDatabase()
    try {
      const [admin] = await testDb.db.select().from(users)
      const created = await createManagedUser(testDb.db, {
        displayName: 'Inactive',
        email: 'inactive@example.com',
        role: 'STAFF',
      })
      const before = await loadActiveUser(testDb.db, created.id)
      await setManagedUserActive(testDb.db, admin!.id, created.id, false)
      await expect(authenticateUser(testDb.db, 'inactive@example.com', TEMPORARY_PASSWORD_DEFAULT)).rejects.toBeInstanceOf(AuthFailure)
      expect(await loadActiveUser(testDb.db, created.id)).toBeNull()
      const [row] = await testDb.db.select().from(users).where(eq(users.id, created.id))
      expect(row?.active).toBe(false)
      expect(row?.sessionVersion).toBe((before?.sessionVersion ?? 0) + 1)
      await setManagedUserActive(testDb.db, admin!.id, created.id, true)
      const restored = await authenticateUser(testDb.db, 'inactive@example.com', TEMPORARY_PASSWORD_DEFAULT)
      expect(restored.id).toBe(created.id)
    } finally {
      await testDb.close()
    }
  })
})
