import { randomUUID } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { programs, users } from '../../server/database/schema'
import { seedDatabase } from '../../drizzle/seed'
import { verifyStaffPassword } from '../../server/services/password'

const original = {
  APP_ENV: process.env.APP_ENV,
  NODE_ENV: process.env.NODE_ENV,
  NUXT_AUTH_PASSWORD: process.env.NUXT_AUTH_PASSWORD,
  NUXT_AUTH_USERNAME: process.env.NUXT_AUTH_USERNAME,
  NUXT_AUTH_EMAIL: process.env.NUXT_AUTH_EMAIL,
  NUXT_AUTH_RESET_PASSWORD: process.env.NUXT_AUTH_RESET_PASSWORD,
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
}

function applyEnv(env: {
  APP_ENV?: string
  NODE_ENV?: string
  NUXT_AUTH_PASSWORD?: string
  NUXT_AUTH_USERNAME?: string
  NUXT_AUTH_EMAIL?: string
  NUXT_AUTH_RESET_PASSWORD?: string
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
}

async function seedFresh(env: {
  APP_ENV?: string
  NODE_ENV?: string
  NUXT_AUTH_PASSWORD?: string
  NUXT_AUTH_USERNAME?: string
  NUXT_AUTH_EMAIL?: string
  NUXT_AUTH_RESET_PASSWORD?: string
}) {
  applyEnv(env)
  const file = join(tmpdir(), `renzo-m10-${randomUUID()}.sqlite`)
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
  it('seeds production admin / setup when no password is configured', async () => {
    const ctx = await seedFresh({
      APP_ENV: 'production',
      NODE_ENV: 'production',
      NUXT_AUTH_RESET_PASSWORD: 'false',
    })
    try {
      const programRows = await ctx.db.select().from(programs)
      expect(programRows.length).toBeGreaterThan(0)
      const [admin] = await ctx.db.select().from(users).where(eq(users.username, 'admin'))
      expect(admin).toBeTruthy()
      expect(admin!.email).toBe('admin@local')
      expect(await verifyStaffPassword(admin!.passwordHash!, 'setup')).toBe(true)
      expect(admin!.mustChangePassword).toBe(false)
    } finally {
      await ctx.close()
    }
  })

  it('creates STAGE admin / setup when no password is configured', async () => {
    const ctx = await seedFresh({
      APP_ENV: 'stage',
      NODE_ENV: 'production',
      NUXT_AUTH_RESET_PASSWORD: 'false',
    })
    try {
      const [admin] = await ctx.db.select().from(users).where(eq(users.username, 'admin'))
      expect(admin).toBeTruthy()
      expect(admin!.email).toBe('admin@local')
      expect(await verifyStaffPassword(admin!.passwordHash!, 'setup')).toBe(true)
    } finally {
      await ctx.close()
    }
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
    } finally {
      await ctx.close()
    }
  })
})
