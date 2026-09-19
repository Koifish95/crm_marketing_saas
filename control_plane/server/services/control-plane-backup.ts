import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Client } from '@libsql/client'
import { sqliteFilePath } from '../database'

export function controlPlaneBackupDir(filesRoot = process.cwd()) {
  return join(filesRoot, 'data', 'backups', 'control-plane')
}

export function controlPlaneBackupFilename(now = new Date()) {
  const stamp = now.toISOString().replaceAll('-', '').replaceAll(':', '').slice(0, 15)
  return `control-plane_${stamp}.sqlite`
}

export async function snapshotControlPlaneRegistry(client: Client, input: {
  databaseUrl?: string
  filesRoot?: string
  now?: Date
} = {}) {
  const source = sqliteFilePath(input.databaseUrl || process.env.DATABASE_URL || 'file:./data/control-plane.sqlite')
  if (!source) {
    throw new Error('Control Plane registry backup requires a file: SQLite URL.')
  }
  const dir = controlPlaneBackupDir(input.filesRoot)
  mkdirSync(dir, { recursive: true })
  const filename = controlPlaneBackupFilename(input.now)
  const dest = join(dir, filename)
  const destSql = dest.replaceAll('\\', '/')
  try {
    await client.execute(`VACUUM INTO '${destSql.replaceAll('\'', '\'\'')}'`)
  } catch {
    if (!source) {
      throw new Error('Control Plane registry backup requires a file: SQLite URL.')
    }
    copyFileSync(source, dest)
  }
  return { path: dest, filename, source }
}
