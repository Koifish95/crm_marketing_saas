import { snapshotSqliteFile } from '../server/services/sqlite-snapshot'

/**
 * In-container SQLite-safe snapshot. Writes VACUUM INTO dest, then integrity-checks.
 * Usage: node docker/sqlite-snapshot.cjs <src.sqlite> <dest.sqlite>
 */
async function main() {
  const src = process.argv[2]
  const dest = process.argv[3]
  if (!src || !dest) {
    throw new Error('Usage: node docker/sqlite-snapshot.cjs <src.sqlite> <dest.sqlite>')
  }
  const url = `file:${src.replaceAll('\\', '/')}`
  await snapshotSqliteFile(url, dest)
  console.info(`[martial-arts] sqlite snapshot ok ${dest}`)
}

main().catch((error: unknown) => {
  console.error('[martial-arts] sqlite snapshot failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
