import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Client } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { createDb, getDatabaseUrl } from './index'

export function migrationsFolder() {
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
    return await applySkippedMigrations(client)
  } finally {
    client.close()
  }
}

/**
 * Drizzle only runs journal entries newer than the last applied one. A registry that received a later
 * migration before an earlier one (hand-copied files on the VPS, 2026-10) would never get the earlier one.
 * Apply any journal entry older than the newest applied migration that has no row, matched by created_at
 * (the file hash changes with line endings).
 */
export async function applySkippedMigrations(client: Client, folder = migrationsFolder()) {
  const applied = await client.execute('SELECT created_at FROM __drizzle_migrations')
  const appliedAt = new Set(applied.rows.map(row => Number(row.created_at)))
  const newest = Math.max(0, ...appliedAt)
  const skipped = readMigrationFiles({ migrationsFolder: folder })
    .filter(migration => migration.folderMillis <= newest && !appliedAt.has(migration.folderMillis))
  for (const migration of skipped) {
    const tx = await client.transaction('write')
    try {
      for (const statement of migration.sql) {
        if (statement.trim()) {
          await tx.execute(statement)
        }
      }
      await tx.execute({
        sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        args: [migration.hash, migration.folderMillis],
      })
      await tx.commit()
    } catch (error) {
      await tx.rollback()
      throw error
    }
    console.log(`Applied skipped migration ${migration.folderMillis}.`)
  }
  return skipped.map(migration => migration.folderMillis)
}

const invoked = process.argv[1]?.replaceAll('\\', '/').endsWith('/server/database/migrate.ts')
if (invoked) {
  migrateDatabase().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
