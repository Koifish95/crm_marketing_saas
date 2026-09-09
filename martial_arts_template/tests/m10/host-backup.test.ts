import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { sqliteFilePath } from '../../server/database'
import { createHostBackup, listHostBackups, pruneHostBackups, readBackupStatus, restoreHostBackup } from '../../server/services/host-backup'
import { BACKUP_RETENTION_DAYS, backupStamp, nextScheduledBackupMs } from '../../shared/utils/backup'
import { APP_ENV_ISOLATION_MARKERS, isolationMarkerFileName } from '../../shared/utils/app-env'
import { DomainError } from '../../server/services/errors'
import { openTestDatabase } from '../helpers/db'

const original = {
  RENZO_BACKUP_DIR: process.env.RENZO_BACKUP_DIR,
}

afterEach(() => {
  if (original.RENZO_BACKUP_DIR === undefined) {
    delete process.env.RENZO_BACKUP_DIR
  } else {
    process.env.RENZO_BACKUP_DIR = original.RENZO_BACKUP_DIR
  }
})

function tempDir(label: string) {
  const dir = join(tmpdir(), `renzo-host-backup-${label}-${randomUUID()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('M10B host backup store', () => {
  it('stamps directories in America/Denver', () => {
    expect(backupStamp(Date.UTC(2026, 8, 6, 8, 0, 0))).toBe('2026-09-06T020000-0600')
  })

  it('schedules the next PRODUCTION run at 02:00 America/Denver', () => {
    const beforeTwo = Date.UTC(2026, 8, 6, 7, 59, 0)
    const afterTwo = Date.UTC(2026, 8, 6, 8, 1, 0)
    expect(nextScheduledBackupMs(beforeTwo)).toBe(Date.UTC(2026, 8, 6, 8, 0, 0))
    expect(nextScheduledBackupMs(afterTwo)).toBe(Date.UTC(2026, 8, 7, 8, 0, 0))
    expect(BACKUP_RETENTION_DAYS).toBe(14)
  })

  it('writes environment-scoped packages without mutating the source sqlite', async () => {
    const testDb = await openTestDatabase()
    const root = tempDir('root')
    try {
      const sqlitePath = sqliteFilePath(testDb.url)
      if (!sqlitePath) {
        throw new Error('expected file sqlite')
      }
      const before = readFileSync(sqlitePath)
      const uploads = join(root, 'uploads')
      mkdirSync(uploads, { recursive: true })
      writeFileSync(join(uploads, 'logo.bin'), 'asset-bytes')

      const prod = await createHostBackup({
        appEnv: 'production',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
        nowMs: Date.UTC(2026, 8, 6, 8, 0, 0),
      })
      const stage = await createHostBackup({
        appEnv: 'stage',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
        nowMs: Date.UTC(2026, 8, 6, 8, 5, 0),
      })
      const dev = await createHostBackup({
        appEnv: 'dev',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
        nowMs: Date.UTC(2026, 8, 6, 8, 10, 0),
      })

      expect(prod.zipPath).toContain(`${join('production', '2026-09-06T020000-0600')}`)
      expect(stage.zipPath).toContain(`${join('stage')}`)
      expect(dev.zipPath).toContain(`${join('dev')}`)
      expect(existsSync(prod.zipPath)).toBe(true)
      expect(listHostBackups('production', root)).toHaveLength(1)
      expect(listHostBackups('stage', root)).toHaveLength(1)
      expect(listHostBackups('dev', root)).toHaveLength(1)
      expect(readFileSync(sqlitePath).equals(before)).toBe(true)
      expect(readBackupStatus(root).lastSuccess?.path).toBe(dev.zipPath)
    } finally {
      await testDb.close()
    }
  })

  it('records failure and does not keep a success path when sqlite is missing', async () => {
    const root = tempDir('fail')
    const uploads = join(root, 'uploads')
    mkdirSync(uploads, { recursive: true })
    await expect(createHostBackup({
      appEnv: 'production',
      sqlitePath: join(root, 'missing.sqlite'),
      uploadsDir: uploads,
      root,
    })).rejects.toThrow(/missing/i)
    const status = readBackupStatus(root)
    expect(status.lastFailure?.appEnv).toBe('production')
    expect(status.lastSuccess).toBeUndefined()
    expect(status.lastPrune).toBeUndefined()
    expect(listHostBackups('production', root)).toHaveLength(0)
  })

  it('does not prune existing PRODUCTION backups when a later backup fails', async () => {
    const testDb = await openTestDatabase()
    const root = tempDir('fail-no-prune')
    try {
      const sqlitePath = sqliteFilePath(testDb.url)
      if (!sqlitePath) {
        throw new Error('expected file sqlite')
      }
      const uploads = join(root, 'uploads')
      mkdirSync(uploads, { recursive: true })
      const nowMs = Date.UTC(2026, 8, 20, 8, 0, 0)
      const existing = await createHostBackup({
        appEnv: 'production',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
        nowMs: nowMs - (15 * 24 * 60 * 60 * 1000),
      })
      await expect(createHostBackup({
        appEnv: 'production',
        sqlitePath: join(root, 'missing.sqlite'),
        uploadsDir: uploads,
        root,
        nowMs,
      })).rejects.toThrow(/missing/i)
      expect(existsSync(existing.zipPath)).toBe(true)
      expect(listHostBackups('production', root)).toHaveLength(1)
      expect(readBackupStatus(root).lastPrune).toBeUndefined()
      expect(readBackupStatus(root).lastSuccess?.path).toBe(existing.zipPath)
    } finally {
      await testDb.close()
    }
  })

  it('restores a DEV backup into DEV after confirmation and keeps destination isolation', async () => {
    const testDb = await openTestDatabase()
    const root = tempDir('restore')
    try {
      const sqlitePath = sqliteFilePath(testDb.url)
      if (!sqlitePath) {
        throw new Error('expected file sqlite')
      }
      const uploads = join(root, 'uploads')
      mkdirSync(uploads, { recursive: true })
      writeFileSync(join(uploads, 'from-dev.txt'), 'dev-asset')
      const backup = await createHostBackup({
        appEnv: 'dev',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
      })

      const destSqlite = join(root, 'dest.sqlite')
      const destUploads = join(root, 'dest-uploads')
      mkdirSync(destUploads, { recursive: true })
      writeFileSync(join(destUploads, 'stale.txt'), 'old')

      const restored = await restoreHostBackup({
        zipPath: backup.zipPath,
        appEnv: 'dev',
        confirmEnv: 'dev',
        sqlitePath: destSqlite,
        uploadsDir: destUploads,
        databaseUrl: `file:${destSqlite.replaceAll('\\', '/')}`,
        root,
      })
      expect(restored.sourceAppEnv).toBe('dev')
      expect(existsSync(destSqlite)).toBe(true)
      expect(readFileSync(join(destUploads, 'from-dev.txt'), 'utf8')).toBe('dev-asset')
      expect(existsSync(join(destUploads, 'stale.txt'))).toBe(false)
      expect(readFileSync(join(destUploads, isolationMarkerFileName('dev')), 'utf8')).toBe(APP_ENV_ISOLATION_MARKERS.dev)
    } finally {
      await testDb.close()
    }
  })

  it('rejects the wrong confirmation and a corrupt zip before changing destination files', async () => {
    const testDb = await openTestDatabase()
    const root = tempDir('guard')
    try {
      const sqlitePath = sqliteFilePath(testDb.url)
      if (!sqlitePath) {
        throw new Error('expected file sqlite')
      }
      const uploads = join(root, 'uploads')
      mkdirSync(uploads, { recursive: true })
      writeFileSync(join(uploads, 'keep.txt'), 'live')
      const backup = await createHostBackup({
        appEnv: 'stage',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
      })

      const destSqlite = join(root, 'dest.sqlite')
      const destUploads = join(root, 'dest-uploads')
      mkdirSync(destUploads, { recursive: true })
      writeFileSync(join(destUploads, 'keep.txt'), 'untouched')
      writeFileSync(destSqlite, 'placeholder')

      await expect(restoreHostBackup({
        zipPath: backup.zipPath,
        appEnv: 'stage',
        confirmEnv: 'production',
        sqlitePath: destSqlite,
        uploadsDir: destUploads,
        root,
      })).rejects.toBeInstanceOf(DomainError)
      expect(readFileSync(destSqlite, 'utf8')).toBe('placeholder')
      expect(readFileSync(join(destUploads, 'keep.txt'), 'utf8')).toBe('untouched')

      writeFileSync(backup.zipPath, 'truncated')
      await expect(restoreHostBackup({
        zipPath: backup.zipPath,
        appEnv: 'stage',
        confirmEnv: 'stage',
        sqlitePath: destSqlite,
        uploadsDir: destUploads,
        root,
      })).rejects.toThrow()
      expect(readFileSync(destSqlite, 'utf8')).toBe('placeholder')
      expect(readFileSync(join(destUploads, 'keep.txt'), 'utf8')).toBe('untouched')
    } finally {
      await testDb.close()
    }
  })

  it('prunes PRODUCTION backups older than 14 days and never drops the kept path', async () => {
    const testDb = await openTestDatabase()
    const root = tempDir('prune')
    try {
      const sqlitePath = sqliteFilePath(testDb.url)
      if (!sqlitePath) {
        throw new Error('expected file sqlite')
      }
      const uploads = join(root, 'uploads')
      mkdirSync(uploads, { recursive: true })
      const nowMs = Date.UTC(2026, 8, 20, 8, 0, 0)
      const expired = await createHostBackup({
        appEnv: 'production',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
        nowMs: nowMs - (15 * 24 * 60 * 60 * 1000),
      })
      const fresh = await createHostBackup({
        appEnv: 'production',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
        nowMs,
      })
      const stage = await createHostBackup({
        appEnv: 'stage',
        sqlitePath,
        uploadsDir: uploads,
        databaseUrl: testDb.url,
        root,
        nowMs: nowMs - (20 * 24 * 60 * 60 * 1000),
      })

      const stagePrune = pruneHostBackups({ appEnv: 'stage', nowMs, root })
      expect(stagePrune.removed).toBe(0)
      expect(existsSync(stage.zipPath)).toBe(true)

      const pruned = pruneHostBackups({
        appEnv: 'production',
        nowMs,
        root,
        keepPaths: [fresh.zipPath],
      })
      expect(pruned.removed).toBe(1)
      expect(existsSync(expired.zipPath)).toBe(false)
      expect(existsSync(fresh.zipPath)).toBe(true)
      expect(listHostBackups('production', root)).toHaveLength(1)
    } finally {
      await testDb.close()
    }
  })
})
