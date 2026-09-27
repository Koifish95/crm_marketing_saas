import { createClient } from '@libsql/client'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export const LOCAL_BACKUP_PREFIX = 'sales-local-'
export const LOCAL_BACKUP_RETENTION_MS = 14 * 24 * 60 * 60 * 1000

export function localBackupDir(root: string) {
  return join(root, 'data', 'backups')
}

export function localBackupFilename(now = new Date()) {
  const stamp = now.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
  return `${LOCAL_BACKUP_PREFIX}${stamp}.sqlite`
}

export function vacuumIntoSql(destPath: string) {
  const escaped = destPath.replaceAll('\\', '/').replaceAll('\'', '\'\'')
  return `VACUUM INTO '${escaped}'`
}

export function sqliteFileUrl(sqlitePath: string) {
  return `file:${sqlitePath.replaceAll('\\', '/')}`
}

export async function assertSqliteIntegrity(sqlitePath: string) {
  const client = createClient({ url: sqliteFileUrl(sqlitePath) })
  try {
    const result = await client.execute('PRAGMA integrity_check')
    const row = result.rows[0] as Record<string, unknown> | undefined
    const value = String(row?.integrity_check ?? 'ok')
    if (value.toLowerCase() !== 'ok') {
      throw new Error(`SQLite integrity check failed: ${value}`)
    }
  } finally {
    client.close()
  }
}

export async function snapshotLocalSqlite(databaseUrl: string, destPath: string) {
  mkdirSync(dirname(destPath), { recursive: true })
  try {
    unlinkSync(destPath)
  } catch {
    // Destination may not exist yet.
  }
  const client = createClient({ url: databaseUrl })
  try {
    await client.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    await client.execute(vacuumIntoSql(destPath))
  } finally {
    client.close()
  }
  await assertSqliteIntegrity(destPath)
  return destPath
}

export function pruneLocalBackups(dir: string, now = Date.now(), retentionMs = LOCAL_BACKUP_RETENTION_MS) {
  if (!existsSync(dir)) {
    return []
  }
  const files = readdirSync(dir)
    .filter(name => name.startsWith(LOCAL_BACKUP_PREFIX) && name.endsWith('.sqlite'))
    .map((name) => {
      const path = join(dir, name)
      return { name, path, mtimeMs: statSync(path).mtimeMs }
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
  const removed: string[] = []
  const cutoff = now - retentionMs
  for (const [index, file] of files.entries()) {
    if (index === 0 || file.mtimeMs >= cutoff) {
      continue
    }
    unlinkSync(file.path)
    removed.push(file.name)
  }
  return removed
}

export function newestLocalBackup(dir: string) {
  if (!existsSync(dir)) {
    return null
  }
  const files = readdirSync(dir)
    .filter(name => name.startsWith(LOCAL_BACKUP_PREFIX) && name.endsWith('.sqlite'))
    .map((name) => {
      const path = join(dir, name)
      return { name, path, mtimeMs: statSync(path).mtimeMs }
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
  return files[0] ?? null
}

export function assertRestoreDestination(livePath: string, destPath: string) {
  if (resolve(livePath).toLowerCase() === resolve(destPath).toLowerCase()) {
    throw new Error('Refusing to restore over the live Sales database.')
  }
}

export async function restoreLocalBackup(input: {
  backupPath: string
  destPath: string
  livePath: string
}) {
  assertRestoreDestination(input.livePath, input.destPath)
  if (!existsSync(input.backupPath)) {
    throw new Error('Backup file not found.')
  }
  mkdirSync(dirname(input.destPath), { recursive: true })
  copyFileSync(input.backupPath, input.destPath)
  await assertSqliteIntegrity(input.destPath)
  return input.destPath
}
