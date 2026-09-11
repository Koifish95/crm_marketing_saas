import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

/**
 * Same algorithm as nuxt-auth-utils (`hashPassword` / `verifyPassword`):
 * scrypt via @adonisjs/hash. Standalone so seed scripts and Vitest can hash
 * without Nitro auto-imports.
 */
const hasher = new Hash(new Scrypt({}))

export async function hashStaffPassword(password: string): Promise<string> {
  return hasher.make(password)
}

export async function verifyStaffPassword(passwordHash: string, password: string): Promise<boolean> {
  return hasher.verify(passwordHash, password)
}

export function isScryptPasswordHash(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith('$scrypt$'))
}
