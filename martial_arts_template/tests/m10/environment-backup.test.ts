import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import { ZipFile } from 'yazl'
import { createClient } from '@libsql/client'
import { sqliteFilePath } from '../../server/database'
import {
  assertRestoreConfirmation,
  backupFilename,
  createBackupArchive,
  restoreBackupArchive,
  sha256File,
  validateBackupArchive,
} from '../../server/services/environment-backup'
import { DomainError } from '../../server/services/errors'
import { APP_ENV_ISOLATION_MARKERS, isolationMarkerFileName } from '../../shared/utils/app-env'
import { openTestDatabase } from '../helpers/db'

const original = {
  APP_ENV: process.env.APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  ASSET_UPLOAD_DIR: process.env.ASSET_UPLOAD_DIR,
}

afterEach(() => {
  if (original.APP_ENV === undefined) {
    delete process.env.APP_ENV
  } else {
    process.env.APP_ENV = original.APP_ENV
  }
  if (original.DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = original.DATABASE_URL
  }
  if (original.ASSET_UPLOAD_DIR === undefined) {
    delete process.env.ASSET_UPLOAD_DIR
  } else {
    process.env.ASSET_UPLOAD_DIR = original.ASSET_UPLOAD_DIR
  }
})

function tempDir(label: string) {
  const dir = join(tmpdir(), `ma-backup-${label}-${randomUUID()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

async function writeArchive(stream: NodeJS.ReadableStream, zipPath: string) {
  await pipeline(stream as Readable, createWriteStream(zipPath))
}

describe('M10 environment backup and restore', () => {
  it('names backups with Denver date and environment', () => {
    expect(backupFilename('production', Date.UTC(2026, 8, 6, 20, 30, 0))).toBe('martial-arts-production-2026-09-06-1430.zip')
  })

  it('requires typing the current environment before restore', () => {
    expect(() => assertRestoreConfirmation('stage', 'production')).toThrow(DomainError)
    expect(() => assertRestoreConfirmation('production', 'production')).not.toThrow()
  })

  it('packs SQLite and uploads, then restamps the destination isolation marker', async () => {
    const testDb = await openTestDatabase()
    const sourceDir = tempDir('src')
    const destDir = tempDir('dst')
    try {
      const sourceSqlite = sqliteFilePath(testDb.url)
      if (!sourceSqlite) {
        throw new Error('expected file sqlite')
      }
      await testDb.client.execute('PRAGMA wal_checkpoint(TRUNCATE)')
      const packedSqlite = join(sourceDir, 'app.sqlite')
      writeFileSync(packedSqlite, readFileSync(sourceSqlite))
      const sourceUploads = join(sourceDir, 'uploads')
      mkdirSync(sourceUploads, { recursive: true })
      writeFileSync(join(sourceUploads, 'asset.txt'), 'creative')
      writeFileSync(join(sourceUploads, isolationMarkerFileName('production')), APP_ENV_ISOLATION_MARKERS.production)

      const zipPath = join(sourceDir, 'backup.zip')
      const backup = await createBackupArchive({
        sqlitePath: packedSqlite,
        uploadsDir: sourceUploads,
        appEnv: 'production',
        nowMs: Date.UTC(2026, 8, 6, 20, 30, 0),
        databaseUrl: `file:${packedSqlite.replaceAll('\\', '/')}`,
      })
      expect(backup.filename).toBe('martial-arts-production-2026-09-06-1430.zip')
      expect(backup.manifest.version).toBe(2)
      expect(backup.manifest.sqliteSha256).toBe(sha256File(packedSqlite))
      expect(backup.manifest.files).toContain('uploads/asset.txt')
      expect(backup.manifest.uploadCount).toBe(1)
      await writeArchive(backup.stream, zipPath)
      const validated = await validateBackupArchive(zipPath)
      expect(validated.manifest.appEnv).toBe('production')
      expect(validated.bytes).toBeGreaterThan(0)

      const destSqlite = join(destDir, 'app.sqlite')
      const destUploads = join(destDir, 'uploads')
      mkdirSync(destUploads, { recursive: true })
      writeFileSync(join(destUploads, 'old.txt'), 'stale')
      writeFileSync(join(destUploads, isolationMarkerFileName('stage')), 'stale-stage')

      const restored = await restoreBackupArchive({
        zipPath,
        sqlitePath: destSqlite,
        uploadsDir: destUploads,
        appEnv: 'stage',
        databaseUrl: `file:${destSqlite.replaceAll('\\', '/')}`,
      })
      expect(restored.sourceAppEnv).toBe('production')
      expect(existsSync(destSqlite)).toBe(true)
      expect(readFileSync(join(destUploads, 'asset.txt'), 'utf8')).toBe('creative')
      expect(existsSync(join(destUploads, 'old.txt'))).toBe(false)
      expect(existsSync(join(destUploads, isolationMarkerFileName('production')))).toBe(false)
      expect(readFileSync(join(destUploads, isolationMarkerFileName('stage')), 'utf8')).toBe(APP_ENV_ISOLATION_MARKERS.stage)

      const client = createClient({ url: `file:${destSqlite.replaceAll('\\', '/')}` })
      try {
        const marker = await client.execute('SELECT value FROM app_settings WHERE key = \'m10a.isolation\'')
        expect(marker.rows[0]?.value).toBe(APP_ENV_ISOLATION_MARKERS.stage)
      } finally {
        client.close()
      }
    } finally {
      await testDb.close()
    }
  })

  it('rejects a zip that is not a valid backup sqlite', async () => {
    const dir = tempDir('bad')
    const zipPath = join(dir, 'bad.zip')
    const zip = new ZipFile()
    zip.addBuffer(Buffer.from(JSON.stringify({
      version: 1,
      appEnv: 'dev',
      createdAt: 1,
    })), 'manifest.json')
    zip.addBuffer(Buffer.from('not a database'), 'sqlite/app.sqlite')
    zip.end()
    await writeArchive(zip.outputStream, zipPath)

    await expect(validateBackupArchive(zipPath)).rejects.toThrow(/not valid|SQLite/)
    await expect(restoreBackupArchive({
      zipPath,
      sqlitePath: join(dir, 'app.sqlite'),
      uploadsDir: join(dir, 'uploads'),
      appEnv: 'dev',
    })).rejects.toThrow(/not valid|SQLite/)
  })
})
