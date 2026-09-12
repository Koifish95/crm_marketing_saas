import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb, getDatabaseUrl } from './index'
import { loadLocalEnv } from '../utils/load-env'

loadLocalEnv()

export function migrationsFolder(): string {
  const fromEnv = process.env.DRIZZLE_MIGRATIONS_DIR?.trim()
  if (fromEnv) {
    return fromEnv
  }
  return join(dirname(fileURLToPath(import.meta.url)), '../../drizzle/migrations')
}

export async function migrateDatabase(databaseUrl = getDatabaseUrl()) {
  const { client, db } = createDb(databaseUrl)
  try {
    await client.execute('PRAGMA foreign_keys = ON')
    await migrate(db, { migrationsFolder: migrationsFolder() })
  } finally {
    client.close()
  }
}

const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('/server/database/migrate.ts')
if (invoked) {
  migrateDatabase().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
