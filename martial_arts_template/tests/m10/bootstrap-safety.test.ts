import { randomUUID } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { users } from '../../server/database/schema'
import { BOOTSTRAP_PASSWORD_REQUIRED, seedDatabase } from '../../drizzle/seed'
import { verifyStaffPassword } from '../../server/services/password'

const original = {
  APP_ENV: process.env.APP_ENV,
  NODE_ENV: process.env.NODE_ENV,
  NUXT_AUTH_PASSWORD: process.env.NUXT_AUTH_PASSWORD,
  NUXT_AUTH_USERNAME: process.env.NUXT_AUTH_USERNAME,
  NUXT_AUTH_EMAIL: process.env.NUXT_AUTH_EMAIL,
  NUXT_AUTH_RESET_PASSWORD: process.env.NUXT_AUTH_RESET_PASSWORD,
  NUXT_AUTH_MUST_CHANGE_PASSWORD: process.env.NUXT_AUTH_MUST_CHANGE_PASSWORD,
}

afterEach(() => {
  applyEnv(original)
})

function clearEnv() {
  delete process.env.APP_ENV
  delete process.env.NODE_ENV
  delete process.env.NUXT_AUTH_PASSWORD
  delete process.env.NUXT_AUTH_USERNAME
  delete process.env.NUXT_AUTH_EMAIL
  delete process.env.NUXT_AUTH_RESET_PASSWORD
  delete process.env.NUXT_AUTH_MUST_CHANGE_PASSWORD
}

function applyEnv(env: {
  APP_ENV?: string
  NODE_ENV?: string
  NUXT_AUTH_PASSWORD?: string
  NUXT_AUTH_USERNAME?: string
  NUXT_AUTH_EMAIL?: string
  NUXT_AUTH_RESET_PASSWORD?: string
  NUXT_AUTH_MUST_CHANGE_PASSWORD?: string
}) {
  clearEnv()
  if (env.APP_ENV !== undefined) {
    process.env.APP_ENV = env.APP_ENV
  }
  if (env.NODE_ENV !== undefined) {
    process.env.NODE_ENV = env.NODE_ENV
  }
  if (env.NUXT_AUTH_PASSWORD !== undefined) {
    process.env.NUXT_AUTH_PASSWORD = env.NUXT_AUTH_PASSWORD
  }
  if (env.NUXT_AUTH_USERNAME !== undefined) {
    process.env.NUXT_AUTH_USERNAME = env.NUXT_AUTH_USERNAME
  }
  if (env.NUXT_AUTH_EMAIL !== undefined) {
    process.env.NUXT_AUTH_EMAIL = env.NUXT_AUTH_EMAIL
  }
  if (env.NUXT_AUTH_RESET_PASSWORD !== undefined) {
    process.env.NUXT_AUTH_RESET_PASSWORD = env.NUXT_AUTH_RESET_PASSWORD
  }
  if (env.NUXT_AUTH_MUST_CHANGE_PASSWORD !== undefined) {
    process.env.NUXT_AUTH_MUST_CHANGE_PASSWORD = env.NUXT_AUTH_MUST_CHANGE_PASSWORD
  }
}

async function seedFresh(env: {
  APP_ENV?: string
  NODE_ENV?: string
  NUXT_AUTH_PASSWORD?: string
  NUXT_AUTH_USERNAME?: string
  NUXT_AUTH_EMAIL?: string
  NUXT_AUTH_RESET_PASSWORD?: string
  NUXT_AUTH_MUST_CHANGE_PASSWORD?: string
}) {
  applyEnv(env)
  const file = join(tmpdir(), `ma-m10-${randomUUID()}.sqlite`)
  const url = `file:${file}`
  await migrateDatabase(url)
  await seedDatabase(url)
  const { client, db } = createDb(url)
  return {
    db,
    async close() {
      client.close()
      try {
        unlinkSync(file)
      } catch {
        // Windows may keep a lock briefly.
      }
    },
  }
}

describe('M10A production bootstrap safety', () => {
  it('refuses to seed production when no password is configured', async () => {
    await expect(seedFresh({
      APP_ENV: 'production',
      NODE_ENV: 'production',
      NUXT_AUTH_RESET_PASSWORD: 'false',
    })).rejects.toThrow(BOOTSTRAP_PASSWORD_REQUIRED)
  })

  it('refuses to seed STAGE when no password is configured', async () => {
    await expect(seedFresh({
      APP_ENV: 'stage',
      NODE_ENV: 'production',
      NUXT_AUTH_RESET_PASSWORD: 'false',
    })).rejects.toThrow(BOOTSTRAP_PASSWORD_REQUIRED)
  })

  it('uses an explicit STAGE password when provided', async () => {
    const ctx = await seedFresh({
      APP_ENV: 'stage',
      NODE_ENV: 'production',
      NUXT_AUTH_USERNAME: 'admin',
      NUXT_AUTH_EMAIL: 'admin@stage.local',
      NUXT_AUTH_PASSWORD: 'StagePass1!',
      NUXT_AUTH_RESET_PASSWORD: 'false',
    })
    try {
      const [admin] = await ctx.db.select().from(users).where(eq(users.email, 'admin@stage.local'))
      expect(admin).toBeTruthy()
      expect(await verifyStaffPassword(admin!.passwordHash!, 'StagePass1!')).toBe(true)
      expect(await verifyStaffPassword(admin!.passwordHash!, 'setup')).toBe(false)
      expect(admin!.mustChangePassword).toBe(false)
    } finally {
      await ctx.close()
    }
  })

  it('forces a password change when NUXT_AUTH_MUST_CHANGE_PASSWORD is true', async () => {
    const ctx = await seedFresh({
      APP_ENV: 'production',
      NODE_ENV: 'production',
      NUXT_AUTH_USERNAME: 'admin',
      NUXT_AUTH_EMAIL: 'admin@customer.local',
      NUXT_AUTH_PASSWORD: 'setup',
      NUXT_AUTH_MUST_CHANGE_PASSWORD: 'true',
      NUXT_AUTH_RESET_PASSWORD: 'false',
    })
    try {
      const [admin] = await ctx.db.select().from(users).where(eq(users.email, 'admin@customer.local'))
      expect(admin?.mustChangePassword).toBe(true)
      expect(await verifyStaffPassword(admin!.passwordHash!, 'setup')).toBe(true)
    } finally {
      await ctx.close()
    }
  })
})
