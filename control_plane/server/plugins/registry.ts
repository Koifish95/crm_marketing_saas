import { migrateDatabase } from '../database/migrate'
import { seedRegistry } from '../database/seed'
import { getDatabaseUrl } from '../database'

export default defineNitroPlugin(async () => {
  const url = String(useRuntimeConfig().databaseUrl || getDatabaseUrl())
  process.env.DATABASE_URL = url
  await migrateDatabase(url)
  await seedRegistry(url)
})
