import { mkdirSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'

const SQLITE_MAGIC = Buffer.from('SQLite format 3\0')

export function sqliteFileUrl(sqlitePath: string) {
  return `file:${sqlitePath.replaceAll('\\', '/')}`
}

export function vacuumIntoSql(destPath: string) {
  const escaped = destPath.replaceAll('\\', '/').replaceAll('\'', '\'\'')
  return `VACUUM INTO '${escaped}'`
}

export async function snapshotSqliteFile(databaseUrl: string, destPath: string) {
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

export async function assertSqliteIntegrity(sqlitePath: string) {
  const client = createClient({ url: sqliteFileUrl(sqlitePath) })
  try {
    const result = await client.execute('PRAGMA integrity_check')
    const row = result.rows[0] as Record<string, unknown> | undefined
    const value = String(row?.integrity_check ?? row?.[0] ?? 'ok')
    if (value.toLowerCase() !== 'ok') {
      throw new Error(`SQLite integrity check failed: ${value}`)
    }
  } finally {
    client.close()
  }
}

export function sqliteMagicPrefix() {
  return SQLITE_MAGIC
}
