import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { createApp, createRouter, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { setUseDbForTests, sqliteFilePath } from '../../server/database'
import { securityEvents, users } from '../../server/database/schema'
import { hashStaffPassword } from '../../server/services/password'
import { processControl } from '../../server/services/system'
import { createBackupArchive } from '../../server/services/environment-backup'
import { utcNowMs } from '../../shared/utils/time'
import { APP_ENV_ISOLATION_MARKERS, isolationMarkerFileName } from '../../shared/utils/app-env'
import type { SessionUser } from '../../server/services/authorization'
import { openTestDatabase } from '../helpers/db'
import backupRoute from '../../server/api/admin/environment/backup.get'
import restoreRoute from '../../server/api/admin/environment/restore.post'

let currentActor: SessionUser | null = null
let server: Server | undefined
const exitSpy = vi.spyOn(processControl, 'exit').mockImplementation(() => undefined)

const original = {
  APP_ENV: process.env.APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  ASSET_UPLOAD_DIR: process.env.ASSET_UPLOAD_DIR,
}

afterEach(async () => {
  currentActor = null
  exitSpy.mockClear()
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
  setUseDbForTests(undefined)
  if (!server) {
    return
  }
  const closing = server
  server = undefined
  await new Promise<void>((resolve, reject) => {
    closing.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
})

async function start(testDb: Awaited<ReturnType<typeof openTestDatabase>>) {
  setUseDbForTests(testDb.db)
  const app = createApp()
  const router = createRouter()
  const withActor = (handler: typeof backupRoute) => eventHandler(async (event) => {
    event.context.authUser = currentActor
    return handler(event)
  })
  router.get('/api/admin/environment/backup', withActor(backupRoute))
  router.post('/api/admin/environment/restore', withActor(restoreRoute))
  app.use(router)
  server = createServer(toNodeListener(app))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return `http://127.0.0.1:${port}`
}

async function json(base: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await response.text()
  try {
    return { status: response.status, body: JSON.parse(text) as unknown }
  } catch {
    return { status: response.status, body: text }
  }
}

async function actorFor(testDb: Awaited<ReturnType<typeof openTestDatabase>>, username: string): Promise<SessionUser> {
  const [row] = await testDb.db.select().from(users).where(eq(users.username, username))
  return {
    id: row!.id,
    email: row!.email,
    displayName: row!.displayName,
    role: row!.role,
    mustChangePassword: false,
  }
}

describe('M10 environment backup HTTP', () => {
  it('forbids STAFF and VIEWER from backup and restore', async () => {
    const testDb = await openTestDatabase()
    try {
      const now = new Date(utcNowMs())
      await testDb.db.insert(users).values([{
        email: 'env-staff@local',
        username: 'env-staff',
        displayName: 'Env Staff',
        role: 'STAFF',
        active: true,
        passwordHash: await hashStaffPassword('staff-password'),
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      }, {
        email: 'env-viewer@local',
        username: 'env-viewer',
        displayName: 'Env Viewer',
        role: 'VIEWER',
        active: true,
        passwordHash: await hashStaffPassword('viewer-password'),
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      }])
      const base = await start(testDb)

      currentActor = null
      expect((await json(base, '/api/admin/environment/backup')).status).toBe(401)

      currentActor = await actorFor(testDb, 'env-viewer')
      expect((await json(base, '/api/admin/environment/backup')).status).toBe(403)

      currentActor = await actorFor(testDb, 'env-staff')
      expect((await json(base, '/api/admin/environment/backup')).status).toBe(403)
      expect((await json(base, '/api/admin/environment/restore', { method: 'POST', body: '{}' })).status).toBe(403)
      expect(exitSpy).not.toHaveBeenCalled()
    } finally {
      await testDb.close()
    }
  })

  it('lets ADMIN download a zip backup of the current sqlite and uploads', async () => {
    const testDb = await openTestDatabase()
    const work = join(tmpdir(), `renzo-backup-http-${randomUUID()}`)
    mkdirSync(work, { recursive: true })
    try {
      const sourceSqlite = sqliteFilePath(testDb.url)
      if (!sourceSqlite) {
        throw new Error('expected file sqlite')
      }
      await testDb.client.execute('PRAGMA wal_checkpoint(TRUNCATE)')
      const sqlitePath = join(work, 'renzo.sqlite')
      writeFileSync(sqlitePath, readFileSync(sourceSqlite))
      const uploads = join(work, 'uploads')
      mkdirSync(uploads, { recursive: true })
      writeFileSync(join(uploads, 'photo.bin'), 'bytes')
      process.env.APP_ENV = 'dev'
      process.env.DATABASE_URL = `file:${sqlitePath.replaceAll('\\', '/')}`
      process.env.ASSET_UPLOAD_DIR = uploads

      currentActor = await actorFor(testDb, 'admin')
      const base = await start(testDb)
      const response = await fetch(`${base}/api/admin/environment/backup`)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/zip')
      expect(response.headers.get('content-disposition')).toMatch(/renzo-dev-.*\.zip/)
      const zipBytes = Buffer.from(await response.arrayBuffer())
      expect(zipBytes.length).toBeGreaterThan(100)

      const events = await testDb.db.select().from(securityEvents)
      expect(events.some(row => row.action === 'ENVIRONMENT_BACKUP' && row.result === 'SUCCESS')).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('lets ADMIN restore a backup zip into the current environment after typed confirmation', async () => {
    const testDb = await openTestDatabase()
    const work = join(tmpdir(), `renzo-restore-http-${randomUUID()}`)
    mkdirSync(work, { recursive: true })
    try {
      const sourceSqlite = sqliteFilePath(testDb.url)
      if (!sourceSqlite) {
        throw new Error('expected file sqlite')
      }
      await testDb.client.execute('PRAGMA wal_checkpoint(TRUNCATE)')
      const packedSqlite = join(work, 'source.sqlite')
      writeFileSync(packedSqlite, readFileSync(sourceSqlite))
      const sourceUploads = join(work, 'source-uploads')
      mkdirSync(sourceUploads, { recursive: true })
      writeFileSync(join(sourceUploads, 'keep.txt'), 'from-source')

      const zipPath = join(work, 'backup.zip')
      const backup = await createBackupArchive({
        sqlitePath: packedSqlite,
        uploadsDir: sourceUploads,
        appEnv: 'production',
        databaseUrl: `file:${packedSqlite.replaceAll('\\', '/')}`,
      })
      await pipeline(backup.stream as Readable, createWriteStream(zipPath))

      const destSqlite = join(work, 'dest.sqlite')
      const destUploads = join(work, 'dest-uploads')
      mkdirSync(destUploads, { recursive: true })
      writeFileSync(destSqlite, readFileSync(packedSqlite))
      writeFileSync(join(destUploads, 'gone.txt'), 'old')
      process.env.APP_ENV = 'stage'
      process.env.DATABASE_URL = `file:${destSqlite.replaceAll('\\', '/')}`
      process.env.ASSET_UPLOAD_DIR = destUploads

      currentActor = await actorFor(testDb, 'admin')
      const base = await start(testDb)

      const denied = await json(base, '/api/admin/environment/restore', { method: 'POST', body: '{}' })
      expect(denied.status).toBeGreaterThanOrEqual(400)
      expect(exitSpy).not.toHaveBeenCalled()

      const form = new FormData()
      form.append('file', new File([readFileSync(zipPath)], 'backup.zip', { type: 'application/zip' }))
      form.append('confirmEnv', 'stage')
      const response = await fetch(`${base}/api/admin/environment/restore`, {
        method: 'POST',
        body: form,
      })
      expect(response.status).toBe(200)
      expect(exitSpy).toHaveBeenCalledWith(0)
      expect(readFileSync(join(destUploads, 'keep.txt'), 'utf8')).toBe('from-source')
      expect(readFileSync(join(destUploads, isolationMarkerFileName('stage')), 'utf8')).toBe(APP_ENV_ISOLATION_MARKERS.stage)
    } finally {
      await testDb.close()
    }
  })
})
