import { describe, expect, it } from 'vitest'
import {
  TEMPORARY_PASSWORD_DEFAULT,
  isPermanentPasswordCompliant,
  normalizeEmail,
  permanentPasswordIssues,
} from '../../shared/utils/password-policy'

describe('password policy', () => {
  it('accepts the default temporary password as a compliant starting secret', () => {
    expect(isPermanentPasswordCompliant(TEMPORARY_PASSWORD_DEFAULT)).toBe(true)
  })

  it('requires length, uppercase, and a special character', () => {
    expect(isPermanentPasswordCompliant('short')).toBe(false)
    expect(isPermanentPasswordCompliant('longenough')).toBe(false)
    expect(isPermanentPasswordCompliant('Longenough')).toBe(false)
    expect(isPermanentPasswordCompliant('Longenough!')).toBe(true)
    expect(permanentPasswordIssues('abc')).toEqual([
      'Use at least 8 characters.',
      'Include at least one uppercase letter.',
      'Include at least one special character.',
    ])
  })

  it('normalizes emails for uniqueness and login', () => {
    expect(normalizeEmail('  Admin@Local ')).toBe('admin@local')
  })
})
