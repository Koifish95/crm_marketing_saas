import { mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { openTestDatabase } from '../helpers/db'
import { sqliteFilePath } from '../../server/database'
import {
  LOCAL_BACKUP_PREFIX,
  LOCAL_BACKUP_RETENTION_MS,
  assertRestoreDestination,
  pruneLocalBackups,
  restoreLocalBackup,
  snapshotLocalSqlite,
} from '../../server/services/local-sqlite-backup'

describe('local Sales sqlite backup', () => {
  it('snapshots with VACUUM INTO and can be queried without replacing the source', async () => {
    const testDb = await openTestDatabase()
    const sourcePath = sqliteFilePath(testDb.url)
    if (!sourcePath) {
      throw new Error('expected file sqlite')
    }
    const dest = join(tmpdir(), `sales-local-snapshot-${randomUUID()}.sqlite`)
    await snapshotLocalSqlite(testDb.url, dest)
    const copy = createClient({ url: `file:${dest.replaceAll('\\', '/')}` })
    try {
      const users = await copy.execute('select count(*) as n from users')
      expect(Number(users.rows[0]?.n)).toBeGreaterThan(0)
    } finally {
      copy.close()
    }
    const stillThere = createClient({ url: testDb.url })
    try {
      const users = await stillThere.execute('select count(*) as n from users')
      expect(Number(users.rows[0]?.n)).toBeGreaterThan(0)
    } finally {
      stillThere.close()
      await testDb.close()
    }
  })

  it('refuses to restore over the live database and prunes backups older than 14 days', async () => {
    const live = join(tmpdir(), `sales-live-${randomUUID()}.sqlite`)
    expect(() => assertRestoreDestination(live, live)).toThrow(/live Sales database/)

    const dir = join(tmpdir(), `sales-backups-${randomUUID()}`)
    mkdirSync(dir, { recursive: true })
    const newest = join(dir, `${LOCAL_BACKUP_PREFIX}newest.sqlite`)
    const stale = join(dir, `${LOCAL_BACKUP_PREFIX}stale.sqlite`)
    writeFileSync(newest, 'new')
    writeFileSync(stale, 'old')
    const old = new Date(Date.now() - LOCAL_BACKUP_RETENTION_MS - 86_400_000)
    utimesSync(stale, old, old)
    const removed = pruneLocalBackups(dir)
    expect(removed).toEqual([`${LOCAL_BACKUP_PREFIX}stale.sqlite`])
    expect(pruneLocalBackups(dir)).toEqual([])
  })

  it('restores a snapshot to a disposable path', async () => {
    const testDb = await openTestDatabase()
    const sourcePath = sqliteFilePath(testDb.url)
    if (!sourcePath) {
      throw new Error('expected file sqlite')
    }
    const backup = join(tmpdir(), `sales-local-backup-${randomUUID()}.sqlite`)
    const restored = join(tmpdir(), `sales-local-restored-${randomUUID()}.sqlite`)
    await snapshotLocalSqlite(testDb.url, backup)
    await restoreLocalBackup({
      backupPath: backup,
      destPath: restored,
      livePath: sourcePath,
    })
    const copy = createClient({ url: `file:${restored.replaceAll('\\', '/')}` })
    try {
      const users = await copy.execute('select count(*) as n from users')
      expect(Number(users.rows[0]?.n)).toBeGreaterThan(0)
    } finally {
      copy.close()
      await testDb.close()
    }
    await expect(restoreLocalBackup({
      backupPath: backup,
      destPath: sourcePath,
      livePath: sourcePath,
    })).rejects.toThrow(/live Sales database/)
  })
})
