import { getDatabaseUrl } from '../server/database'
import { migrateDatabase } from '../server/database/migrate'
import { seedDatabase } from '../drizzle/seed'

/**
 * Container startup: apply migrations, then seed catalog/bootstrap.
 * Failures exit non-zero so Docker does not mark the app healthy.
 * Does not print secret values.
 */
async function main() {
  const databaseUrl = getDatabaseUrl()
  console.info('[martial-arts] applying database migrations')
  await migrateDatabase(databaseUrl)

  if (process.env.APP_SKIP_SEED === 'true') {
    console.info('[martial-arts] skipping seed (APP_SKIP_SEED=true)')
    return
  }

  console.info('[martial-arts] seeding catalog and bootstrap data')
  await seedDatabase(databaseUrl)
}

main().catch((error: unknown) => {
  console.error('[martial-arts] startup initialization failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
