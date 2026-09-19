import { randomBytes } from 'node:crypto'
import { isPermanentPasswordCompliant } from './password-policy'

export const FORBIDDEN_BOOTSTRAP_PASSWORDS = ['setup'] as const

export function normalizeBootstrapPassword(password: string) {
  return password.trim().toLowerCase()
}

export function isForbiddenBootstrapPassword(password: string) {
  return (FORBIDDEN_BOOTSTRAP_PASSWORDS as readonly string[]).includes(normalizeBootstrapPassword(password))
}

export function generateInitialAccessPassword() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const password = `A${randomBytes(12).toString('base64url')}!`
    if (isPermanentPasswordCompliant(password) && !isForbiddenBootstrapPassword(password)) {
      return password
    }
  }
  throw new Error('Unable to generate a unique initial-access password.')
}
