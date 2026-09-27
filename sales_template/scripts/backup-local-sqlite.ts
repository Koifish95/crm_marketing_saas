import { statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteFilePath } from '../server/database'
import {
  localBackupDir,
  localBackupFilename,
  newestLocalBackup,
  pruneLocalBackups,
  restoreLocalBackup,
  snapshotLocalSqlite,
} from '../server/services/local-sqlite-backup'
import { loadLocalEnv } from '../server/utils/load-env'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

loadLocalEnv()

function argValue(name: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return undefined
  }
  return process.argv[index + 1]
}

function liveSqlitePath() {
  const url = process.env.DATABASE_URL ?? 'file:./data/app.sqlite'
  const filePath = sqliteFilePath(url)
  if (!filePath) {
    throw new Error('Local Sales backup requires a file: SQLite URL.')
  }
  return isAbsolute(filePath) ? filePath : resolve(ROOT, filePath)
}

function databaseUrlFor(filePath: string) {
  return `file:${filePath.replaceAll('\\', '/')}`
}

async function backup() {
  const livePath = liveSqlitePath()
  const destPath = join(localBackupDir(ROOT), localBackupFilename())
  await snapshotLocalSqlite(databaseUrlFor(livePath), destPath)
  const removed = pruneLocalBackups(localBackupDir(ROOT))
  const bytes = statSync(destPath).size
  console.log(JSON.stringify({
    ok: true,
    backup: destPath,
    bytes,
    live: livePath,
    pruned: removed,
    retentionDays: 14,
  }))
}

async function restore() {
  const to = argValue('--to')
  if (!to) {
    throw new Error('Restore requires --to <disposable-sqlite-path>. It will not replace the live database.')
  }
  const livePath = liveSqlitePath()
  const from = argValue('--from') ?? newestLocalBackup(localBackupDir(ROOT))?.path
  if (!from) {
    throw new Error('No local Sales backup found. Run pnpm backup:local first.')
  }
  const destPath = isAbsolute(to) ? to : resolve(ROOT, to)
  await restoreLocalBackup({
    backupPath: isAbsolute(from) ? from : resolve(ROOT, from),
    destPath,
    livePath,
  })
  console.log(JSON.stringify({
    ok: true,
    restored: destPath,
    from: isAbsolute(from) ? from : resolve(ROOT, from),
    liveUntouched: livePath,
  }))
}

const command = process.argv[2] === 'restore' ? 'restore' : 'backup'

if (command === 'restore') {
  await restore()
} else {
  await backup()
}
