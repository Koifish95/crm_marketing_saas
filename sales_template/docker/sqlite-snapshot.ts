import { snapshotLocalSqlite, sqliteFileUrl } from '../server/services/local-sqlite-backup'

/**
 * In-container SQLite-safe snapshot for Control Plane backups of a running environment.
 * Writes VACUUM INTO dest, then integrity-checks.
 * Usage: node docker/sqlite-snapshot.cjs <src.sqlite> <dest.sqlite>
 */
async function main() {
  const src = process.argv[2]
  const dest = process.argv[3]
  if (!src || !dest) {
    throw new Error('Usage: node docker/sqlite-snapshot.cjs <src.sqlite> <dest.sqlite>')
  }
  await snapshotLocalSqlite(sqliteFileUrl(src), dest)
  console.info(`[sales] sqlite snapshot ok ${dest}`)
}

main().catch((error: unknown) => {
  console.error('[sales] sqlite snapshot failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
