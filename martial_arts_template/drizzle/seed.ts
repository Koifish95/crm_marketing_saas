import { eq } from 'drizzle-orm'
import { createDb, getDatabaseUrl } from '../server/database'
import { appSettings, leadSources, lostReasons, programs, users } from '../server/database/schema'
import { seedAccessCatalog } from '../server/services/access-rights'
import { ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT, ALLOW_EARLY_TRIAL_OUTCOMES_KEY } from '../shared/utils/trial-outcomes'
import {
  COMPENSATION_BASIS_KEY,
  COMPENSATION_BASIS_PERCENT_OF_MONTHLY,
  COMPENSATION_BPS_KEY,
  COMPENSATION_TRACKED_OWNER_KEY,
} from '../shared/utils/compensation'
import { hashStaffPassword } from '../server/services/password'
import { utcNowMs } from '../shared/utils/time'
import { loadLocalEnv } from '../server/utils/load-env'
import { readAppEnv } from '../shared/utils/app-env'

export const BOOTSTRAP_PASSWORD_REQUIRED
  = 'NUXT_AUTH_PASSWORD is required to seed an admin user. Seed will not invent a default password.'

loadLocalEnv()

const PROGRAM_SEED = [
  { code: 'ADULT_BJJ', name: 'Adult BJJ', active: true, seasonal: false },
  { code: 'KIDS_BJJ', name: 'Kids BJJ', active: true, seasonal: false },
  { code: 'STRIKING', name: 'Striking', active: false, seasonal: true },
  { code: 'WRESTLING', name: 'Wrestling', active: false, seasonal: true },
] as const

export function getBootstrapAdmin(env: NodeJS.Dict<string | undefined> = process.env) {
  const appEnv = readAppEnv(env)
  const username = (env.NUXT_AUTH_USERNAME ?? 'admin').trim().toLowerCase()
  const email = (env.NUXT_AUTH_EMAIL ?? `${username}@local`).trim().toLowerCase()
  const password = env.NUXT_AUTH_PASSWORD?.trim() || undefined
  if (!password) {
    throw new Error(BOOTSTRAP_PASSWORD_REQUIRED)
  }
  const reset = env.NUXT_AUTH_RESET_PASSWORD === 'true'
  return { username, email, password, reset, appEnv }
}

export async function seedDatabase(databaseUrl = getDatabaseUrl()) {
  const admin = getBootstrapAdmin()
  const { client, db } = createDb(databaseUrl)
  const now = new Date(utcNowMs())

  try {
    await client.execute('PRAGMA foreign_keys = ON')

    const existingEarlyOutcomeSetting = await db.select().from(appSettings)
      .where(eq(appSettings.key, ALLOW_EARLY_TRIAL_OUTCOMES_KEY))
      .limit(1)
    if (existingEarlyOutcomeSetting.length === 0) {
      await db.insert(appSettings).values({
        key: ALLOW_EARLY_TRIAL_OUTCOMES_KEY,
        value: ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT ? 'true' : 'false',
        updatedAt: now,
        updatedByUserId: null,
      })
    }

    const compensationKeys = [
      { key: COMPENSATION_BASIS_KEY, value: COMPENSATION_BASIS_PERCENT_OF_MONTHLY },
      { key: COMPENSATION_BPS_KEY, value: '0' },
      { key: COMPENSATION_TRACKED_OWNER_KEY, value: '' },
    ]
    for (const item of compensationKeys) {
      const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, item.key)).limit(1)
      if (!existing) {
        await db.insert(appSettings).values({
          key: item.key,
          value: item.value,
          updatedAt: now,
          updatedByUserId: null,
        })
      }
    }

    for (const program of PROGRAM_SEED) {
      const existing = await db.select().from(programs).where(eq(programs.code, program.code)).limit(1)
      if (existing.length === 0) {
        await db.insert(programs).values({
          ...program,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    const sourceSeed = [
      { code: 'INSTAGRAM', name: 'Instagram', sortOrder: 10 },
      { code: 'FACEBOOK', name: 'Facebook', sortOrder: 20 },
      { code: 'WALK_IN', name: 'Walk-in', sortOrder: 30 },
      { code: 'REFERRAL', name: 'Referral', sortOrder: 40 },
      { code: 'WEBSITE', name: 'Website', sortOrder: 50 },
      { code: 'PHONE', name: 'Phone', sortOrder: 60 },
      { code: 'OTHER', name: 'Other', sortOrder: 70 },
    ] as const
    for (const source of sourceSeed) {
      const existing = await db.select().from(leadSources).where(eq(leadSources.code, source.code)).limit(1)
      if (existing.length === 0) {
        await db.insert(leadSources).values({ ...source, active: true, createdAt: now, updatedAt: now })
      }
    }

    const lostSeed = [
      { code: 'NOT_INTERESTED', name: 'Not interested', sortOrder: 10 },
      { code: 'PRICE', name: 'Price', sortOrder: 20 },
      { code: 'SCHEDULE', name: 'Schedule', sortOrder: 30 },
      { code: 'LOCATION', name: 'Location', sortOrder: 40 },
      { code: 'NO_RESPONSE', name: 'No response', sortOrder: 50 },
      { code: 'JOINED_ELSEWHERE', name: 'Joined another gym', sortOrder: 60 },
      { code: 'NOT_READY', name: 'Not ready', sortOrder: 70 },
      { code: 'OTHER', name: 'Other', sortOrder: 80 },
    ] as const
    for (const reason of lostSeed) {
      const existing = await db.select().from(lostReasons).where(eq(lostReasons.code, reason.code)).limit(1)
      if (existing.length === 0) {
        await db.insert(lostReasons).values({ ...reason, active: true, createdAt: now, updatedAt: now })
      }
    }

    if (admin.reset) {
      const resetHash = await hashStaffPassword(admin.password)
      const allUsers = await db.select({ id: users.id, sessionVersion: users.sessionVersion }).from(users)
      for (const row of allUsers) {
        await db.update(users).set({
          passwordHash: resetHash,
          mustChangePassword: false,
          sessionVersion: row.sessionVersion + 1,
          updatedAt: now,
        }).where(eq(users.id, row.id))
      }
    }

    const [existingAdmin] = await db.select().from(users).where(eq(users.email, admin.email)).limit(1)
    const [existingByUsername] = existingAdmin
      ? [existingAdmin]
      : await db.select().from(users).where(eq(users.username, admin.username)).limit(1)
    const current = existingAdmin ?? existingByUsername
    const shouldSetPassword = !current || !current.passwordHash || admin.reset

    let passwordHash = current?.passwordHash ?? null
    if (shouldSetPassword) {
      passwordHash = await hashStaffPassword(admin.password)
    }

    if (!current) {
      await db.insert(users).values({
        email: admin.email,
        username: admin.username,
        displayName: 'Admin',
        role: 'ADMIN',
        active: true,
        passwordHash,
        mustChangePassword: false,
        sessionVersion: 0,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await db.update(users).set({
        username: current.username || admin.username,
        passwordHash: shouldSetPassword ? passwordHash : current.passwordHash,
        ...(shouldSetPassword ? { mustChangePassword: false } : {}),
        updatedAt: now,
      }).where(eq(users.id, current.id))
    }

    await seedAccessCatalog(db)
  } finally {
    client.close()
  }
}

const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('/drizzle/seed.ts')
if (invoked) {
  seedDatabase().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
