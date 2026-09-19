import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { sqliteFilePath } from '../../server/database'
import { snapshotSqliteFile, assertSqliteIntegrity } from '../../server/services/sqlite-snapshot'
import { createHostBackup, restoreHostBackup } from '../../server/services/host-backup'
import { openTestDatabase } from '../helpers/db'

describe('Customer #1 SQLite-safe backup', () => {
  it('snapshots with VACUUM INTO, integrity-checks, and restores records', async () => {
    const testDb = await openTestDatabase()
    const sqlitePath = sqliteFilePath(testDb.url)
    if (!sqlitePath) {
      throw new Error('expected file sqlite')
    }
    const dest = join(tmpdir(), `ma-snapshot-${randomUUID()}.sqlite`)
    await snapshotSqliteFile(testDb.url, dest)
    await assertSqliteIntegrity(dest)
    expect(readFileSync(dest).subarray(0, 16).toString('utf8')).toContain('SQLite format 3')

    const root = join(tmpdir(), `ma-backup-root-${randomUUID()}`)
    const uploads = join(root, 'uploads')
    const { mkdirSync, writeFileSync } = await import('node:fs')
    mkdirSync(uploads, { recursive: true })
    writeFileSync(join(uploads, 'logo.jpg'), 'asset-bytes')
    const backup = await createHostBackup({
      appEnv: 'production',
      sqlitePath,
      uploadsDir: uploads,
      databaseUrl: testDb.url,
      root,
    })
    const restoreDir = join(tmpdir(), `ma-restore-${randomUUID()}`)
    mkdirSync(restoreDir, { recursive: true })
    const restoredSqlite = join(restoreDir, 'app.sqlite')
    const restoredUploads = join(restoreDir, 'uploads')
    await restoreHostBackup({
      zipPath: backup.zipPath,
      appEnv: 'production',
      confirmEnv: 'production',
      sqlitePath: restoredSqlite,
      uploadsDir: restoredUploads,
      databaseUrl: `file:${restoredSqlite.replaceAll('\\', '/')}`,
      root,
    })
    await assertSqliteIntegrity(restoredSqlite)
    expect(readFileSync(join(restoredUploads, 'logo.jpg'), 'utf8')).toBe('asset-bytes')
    await testDb.close()
  })
})
