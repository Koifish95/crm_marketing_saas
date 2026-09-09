import { eq } from 'drizzle-orm'
import { createDb, getDatabaseUrl } from '../server/database'
import { appSettings, introAvailabilityRules, householdPricingRules, leadSources, lostReasons, membershipOfferings, programs, users } from '../server/database/schema'
import { seedAccessCatalog } from '../server/services/access-rights'
import { ALLOW_EARLY_TRIAL_OUTCOMES_DEFAULT, ALLOW_EARLY_TRIAL_OUTCOMES_KEY } from '../shared/utils/trial-outcomes'
import {
  COMPENSATION_BASIS_KEY,
  COMPENSATION_BASIS_PERCENT_OF_MONTHLY,
  COMPENSATION_BPS_KEY,
  COMPENSATION_DEFAULT_BPS,
  COMPENSATION_TRACKED_OWNER_KEY,
} from '../shared/utils/compensation'
import { hashStaffPassword } from '../server/services/password'
import { utcNowMs } from '../shared/utils/time'
import { loadLocalEnv } from '../server/utils/load-env'
import { readAppEnv } from '../shared/utils/app-env'
import { INTRO_RULE_SEED } from './intro-seed'

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
  const fromEnv = env.NUXT_AUTH_PASSWORD?.trim() || undefined
  const password = fromEnv ?? 'setup'
  const reset = env.NUXT_AUTH_RESET_PASSWORD === 'true'
  return { username, email, password, reset, appEnv }
}

export async function seedDatabase(databaseUrl = getDatabaseUrl()) {
  const { client, db } = createDb(databaseUrl)
  const now = new Date(utcNowMs())
  const admin = getBootstrapAdmin()

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
      { key: COMPENSATION_BPS_KEY, value: String(COMPENSATION_DEFAULT_BPS) },
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

    const programRows = await db.select().from(programs)
    const programIdByCode = Object.fromEntries(programRows.map(row => [row.code, row.id]))

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

    const adultId = programIdByCode.ADULT_BJJ
    const kidsId = programIdByCode.KIDS_BJJ
    if (adultId) {
      const existingOffering = await db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, adultId)).limit(1)
      if (existingOffering.length === 0) {
        await db.insert(membershipOfferings).values({
          name: 'Adult BJJ membership',
          programId: adultId,
          monthlyCents: 17500,
          enrollmentCents: 0,
          active: true,
          sortOrder: 10,
          createdAt: now,
          updatedAt: now,
        })
      }
      const existingRule = await db.select().from(householdPricingRules).where(eq(householdPricingRules.programId, adultId)).limit(1)
      if (existingRule.length === 0) {
        await db.insert(householdPricingRules).values({
          programId: adultId,
          firstMonthlyCents: 17500,
          additionalMonthlyCents: 15500,
          active: true,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    if (kidsId) {
      const existingKids = await db.select().from(membershipOfferings).where(eq(membershipOfferings.programId, kidsId)).limit(1)
      if (existingKids.length === 0) {
        await db.insert(membershipOfferings).values({
          name: 'Kids BJJ membership',
          programId: kidsId,
          monthlyCents: 15000,
          enrollmentCents: 0,
          active: true,
          sortOrder: 20,
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    for (const rule of INTRO_RULE_SEED) {
      const programId = programIdByCode[rule.programCode]
      if (!programId) {
        continue
      }
      const existing = await db.select().from(introAvailabilityRules).where(eq(introAvailabilityRules.seedKey, rule.seedKey)).limit(1)
      if (existing.length > 0) {
        continue
      }
      await db.insert(introAvailabilityRules).values({
        seedKey: rule.seedKey,
        programId,
        weekday: rule.weekday,
        startMinute: rule.startMinute,
        endMinute: 'endMinute' in rule ? rule.endMinute ?? null : null,
        name: rule.name,
        ageMin: 'ageMin' in rule ? rule.ageMin ?? null : null,
        ageMax: 'ageMax' in rule ? rule.ageMax ?? null : null,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (admin.reset && admin.password) {
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
    const shouldSetPassword = Boolean(admin.password) && (!current || !current.passwordHash || admin.reset)

    let passwordHash = current?.passwordHash ?? null
    if (shouldSetPassword && admin.password) {
      passwordHash = await hashStaffPassword(admin.password)
    }

    if (!current) {
      if (!passwordHash) {
        console.info('[renzo] skipping admin bootstrap; no password configured for this environment')
      } else {
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
      }
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
