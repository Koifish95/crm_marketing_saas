import { randomUUID } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedDatabase } from '../../drizzle/seed'

export const TEST_ADMIN_USERNAME = 'admin'
export const TEST_ADMIN_EMAIL = 'admin@local'
export const TEST_ADMIN_PASSWORD = 'setup'

export async function openTestDatabase() {
  process.env.NUXT_AUTH_USERNAME = TEST_ADMIN_USERNAME
  process.env.NUXT_AUTH_EMAIL = TEST_ADMIN_EMAIL
  process.env.NUXT_AUTH_PASSWORD = TEST_ADMIN_PASSWORD
  process.env.NUXT_AUTH_RESET_PASSWORD = 'false'

  const file = join(tmpdir(), `sales-test-${randomUUID()}.sqlite`)
  const url = `file:${file}`
  await migrateDatabase(url)
  await seedDatabase(url)
  const { client, db } = createDb(url)
  await client.execute('PRAGMA foreign_keys = ON')
  return {
    url,
    db,
    client,
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
