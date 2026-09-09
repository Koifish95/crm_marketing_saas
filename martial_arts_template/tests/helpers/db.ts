import { randomUUID } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { appSettings, householdPricingRules, membershipOfferings, programs } from '../../server/database/schema'
import { seedDatabase } from '../../drizzle/seed'
import { seedIntroAvailabilityRules } from '../../drizzle/intro-seed'
import { COMPENSATION_BPS_KEY } from '../../shared/utils/compensation'
import { utcNowMs } from '../../shared/utils/time'

export const TEST_ADMIN_USERNAME = 'admin'
export const TEST_ADMIN_EMAIL = 'admin@local'
export const TEST_ADMIN_PASSWORD = 'setup'

export async function installTestAcademyFixtures(db: ReturnType<typeof createDb>['db']) {
  const now = new Date(utcNowMs())
  const programRows = await db.select().from(programs)
  const programIdByCode = Object.fromEntries(programRows.map(row => [row.code, row.id]))
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

  await seedIntroAvailabilityRules(db, programIdByCode, now)

  const [bps] = await db.select().from(appSettings).where(eq(appSettings.key, COMPENSATION_BPS_KEY)).limit(1)
  if (bps) {
    await db.update(appSettings).set({
      value: '5000',
      updatedAt: now,
    }).where(eq(appSettings.key, COMPENSATION_BPS_KEY))
  } else {
    await db.insert(appSettings).values({
      key: COMPENSATION_BPS_KEY,
      value: '5000',
      updatedAt: now,
      updatedByUserId: null,
    })
  }
}

export async function openTestDatabase(options?: { fixtures?: boolean }) {
  process.env.NUXT_AUTH_USERNAME = TEST_ADMIN_USERNAME
  process.env.NUXT_AUTH_EMAIL = TEST_ADMIN_EMAIL
  process.env.NUXT_AUTH_PASSWORD = TEST_ADMIN_PASSWORD
  process.env.NUXT_AUTH_RESET_PASSWORD = 'false'

  const file = join(tmpdir(), `renzo-m1-${randomUUID()}.sqlite`)
  const url = `file:${file}`
  await migrateDatabase(url)
  await seedDatabase(url)
  const { client, db } = createDb(url)
  await client.execute('PRAGMA foreign_keys = ON')
  await client.execute('PRAGMA busy_timeout = 5000')
  if (options?.fixtures !== false) {
    await installTestAcademyFixtures(db)
  }
  return {
    url,
    db,
    client,
    async close() {
      client.close()
      try {
        unlinkSync(file)
      } catch {
        // Windows may keep a lock briefly; the OS temp dir will clean up.
      }
    },
  }
}
