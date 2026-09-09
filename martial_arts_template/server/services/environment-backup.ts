import { createHash, randomUUID } from 'node:crypto'
import {
  closeSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, normalize, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage } from 'node:http'
import { createClient } from '@libsql/client'
import busboy from 'busboy'
import { openPromise } from 'yauzl'
import { ZipFile } from 'yazl'
import {
  APP_ENV_ISOLATION_MARKERS,
  isolationMarkerFileName,
  isolationMarkerFileNames,
  isIsolationMarkerFileName,
  readAppEnv,
  type AppEnv,
} from '../../shared/utils/app-env'
import { BUSINESS_TIMEZONE, denverParts, utcNowMs } from '../../shared/utils/time'
import { getDatabaseUrl, sqliteFilePath } from '../database'
import { uploadsDirectory } from './assets'
import { DomainError } from './errors'

export const BACKUP_MANIFEST_VERSION = 2
export const BACKUP_SUPPORTED_MANIFEST_VERSIONS = [1, 2] as const
export const BACKUP_SQLITE_ENTRY = 'sqlite/app.sqlite'
export const BACKUP_MANIFEST_ENTRY = 'manifest.json'
export const BACKUP_UPLOADS_PREFIX = 'uploads/'
export const DEFAULT_BACKUP_MAX_BYTES = 512 * 1024 * 1024
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0')

export type BackupManifest = {
  version: number
  appEnv: AppEnv
  createdAt: number
  timezone?: string
  sqliteSha256?: string
  uploadCount?: number
  files?: string[]
}

export function backupMaxBytes(env: NodeJS.Dict<string | undefined> = process.env) {
  const raw = env.APP_BACKUP_MAX_BYTES?.trim()
  if (!raw) {
    return DEFAULT_BACKUP_MAX_BYTES
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new DomainError('APP_BACKUP_MAX_BYTES must be a positive integer.')
  }
  return parsed
}

export function backupFilename(appEnv: AppEnv, nowMs = utcNowMs()) {
  const parts = denverParts(nowMs)
  const hhmm = `${String(parts.hour).padStart(2, '0')}${String(parts.minute).padStart(2, '0')}`
  return `martial-arts-${appEnv}-${parts.ymd}-${hhmm}.zip`
}

export function assertRestoreConfirmation(confirmEnv: string, appEnv: AppEnv) {
  if (confirmEnv.trim() !== appEnv) {
    throw new DomainError(`Type ${appEnv} to confirm restoring into this environment.`)
  }
}

export async function checkpointSqlite(databaseUrl: string) {
  const client = createClient({ url: databaseUrl })
  try {
    await client.execute('PRAGMA wal_checkpoint(TRUNCATE)')
  } finally {
    client.close()
  }
}

export async function createBackupArchive(input: {
  sqlitePath: string
  uploadsDir: string
  appEnv: AppEnv
  nowMs?: number
  databaseUrl?: string
}) {
  const sqlitePath = resolve(input.sqlitePath)
  if (!existsSync(sqlitePath)) {
    throw new DomainError('SQLite file is missing.')
  }

  const databaseUrl = input.databaseUrl ?? sqliteFileUrl(sqlitePath)
  await checkpointSqlite(databaseUrl)

  const nowMs = input.nowMs ?? utcNowMs()
  const files = [BACKUP_MANIFEST_ENTRY, BACKUP_SQLITE_ENTRY]
  const zip = new ZipFile()
  if (existsSync(`${sqlitePath}-wal`)) {
    files.push(`${BACKUP_SQLITE_ENTRY}-wal`)
  }
  if (existsSync(`${sqlitePath}-shm`)) {
    files.push(`${BACKUP_SQLITE_ENTRY}-shm`)
  }
  const uploads = collectUploadEntries(input.uploadsDir)
  files.push(...uploads.names)

  const manifest: BackupManifest = {
    version: BACKUP_MANIFEST_VERSION,
    appEnv: input.appEnv,
    createdAt: nowMs,
    timezone: BUSINESS_TIMEZONE,
    sqliteSha256: sha256File(sqlitePath),
    uploadCount: uploads.count,
    files,
  }
  zip.addBuffer(Buffer.from(JSON.stringify(manifest)), BACKUP_MANIFEST_ENTRY)
  zip.addFile(sqlitePath, BACKUP_SQLITE_ENTRY)
  addSiblingIfPresent(zip, sqlitePath, '-wal')
  addSiblingIfPresent(zip, sqlitePath, '-shm')
  for (const upload of uploads.entries) {
    zip.addFile(upload.absolute, upload.zipName)
  }
  zip.end()

  return {
    stream: zip.outputStream,
    filename: backupFilename(input.appEnv, nowMs),
    manifest,
  }
}

export async function writeBackupArchive(zipPath: string, input: {
  sqlitePath: string
  uploadsDir: string
  appEnv: AppEnv
  nowMs?: number
  databaseUrl?: string
}) {
  const backup = await createBackupArchive(input)
  await pipeline(backup.stream, createWriteStream(zipPath))
  const validated = await validateBackupArchive(zipPath)
  return {
    filename: backup.filename,
    manifest: validated.manifest,
    bytes: statSync(zipPath).size,
    zipPath,
  }
}

export async function validateBackupArchive(zipPath: string) {
  if (!existsSync(zipPath) || !statSync(zipPath).isFile()) {
    throw new DomainError('Backup zip is missing.')
  }
  const extractDir = join(tmpdir(), `ma-validate-${randomUUID()}`)
  mkdirSync(extractDir, { recursive: true })
  try {
    await extractZip(zipPath, extractDir)
    const manifest = readManifest(join(extractDir, BACKUP_MANIFEST_ENTRY))
    const extractedSqlite = join(extractDir, ...BACKUP_SQLITE_ENTRY.split('/'))
    assertSqliteFile(extractedSqlite)
    if (manifest.sqliteSha256) {
      const actual = sha256File(extractedSqlite)
      if (actual !== manifest.sqliteSha256) {
        throw new DomainError('Backup SQLite checksum does not match the manifest.')
      }
    }
    return { manifest, bytes: statSync(zipPath).size }
  } finally {
    rmSync(extractDir, { recursive: true, force: true })
  }
}

export function sha256File(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export async function createLiveBackup(nowMs = utcNowMs()) {
  const databaseUrl = getDatabaseUrl()
  const sqlitePath = sqliteFilePath(databaseUrl)
  if (!sqlitePath) {
    throw new DomainError('Backups are only available for file SQLite databases.')
  }
  return createBackupArchive({
    sqlitePath,
    uploadsDir: uploadsDirectory(),
    appEnv: readAppEnv(),
    nowMs,
    databaseUrl,
  })
}

export async function restoreBackupArchive(input: {
  zipPath: string
  sqlitePath: string
  uploadsDir: string
  appEnv: AppEnv
  databaseUrl?: string
}) {
  const extractDir = join(tmpdir(), `ma-restore-${randomUUID()}`)
  mkdirSync(extractDir, { recursive: true })
  try {
    await extractZip(input.zipPath, extractDir)
    const manifest = readManifest(join(extractDir, BACKUP_MANIFEST_ENTRY))
    const extractedSqlite = join(extractDir, ...BACKUP_SQLITE_ENTRY.split('/'))
    assertSqliteFile(extractedSqlite)
    if (manifest.sqliteSha256) {
      const actual = sha256File(extractedSqlite)
      if (actual !== manifest.sqliteSha256) {
        throw new DomainError('Backup SQLite checksum does not match the manifest.')
      }
    }

    const sqlitePath = resolve(input.sqlitePath)
    const uploadsDir = resolve(input.uploadsDir)
    mkdirSync(dirname(sqlitePath), { recursive: true })
    mkdirSync(uploadsDir, { recursive: true })

    const liveUrl = input.databaseUrl ?? sqliteFileUrl(sqlitePath)
    if (existsSync(sqlitePath)) {
      try {
        await checkpointSqlite(liveUrl)
      } catch {
        // Replacing files still proceeds if the live database cannot checkpoint.
      }
    }

    replaceSqliteFiles(extractedSqlite, sqlitePath)
    replaceUploads(join(extractDir, 'uploads'), uploadsDir)
    restampIsolationFiles(uploadsDir, input.appEnv)
    await restampIsolationSetting(sqlitePath, input.appEnv)

    return { sourceAppEnv: manifest.appEnv }
  } finally {
    rmSync(extractDir, { recursive: true, force: true })
  }
}

export async function restoreLiveBackup(zipPath: string, confirmEnv: string) {
  const appEnv = readAppEnv()
  assertRestoreConfirmation(confirmEnv, appEnv)
  const databaseUrl = getDatabaseUrl()
  const sqlitePath = sqliteFilePath(databaseUrl)
  if (!sqlitePath) {
    throw new DomainError('Restore is only available for file SQLite databases.')
  }
  return restoreBackupArchive({
    zipPath,
    sqlitePath,
    uploadsDir: uploadsDirectory(),
    appEnv,
    databaseUrl,
  })
}

export async function saveRestoreUpload(req: IncomingMessage, maxBytes = backupMaxBytes()) {
  return new Promise<{ zipPath: string, confirmEnv: string }>((resolveUpload, reject) => {
    let settled = false
    const zipPath = join(tmpdir(), `ma-restore-upload-${randomUUID()}.zip`)
    const fail = (error: Error) => {
      if (settled) {
        return
      }
      settled = true
      try {
        unlinkSync(zipPath)
      } catch {
        // Temp file may not exist yet.
      }
      reject(error)
    }

    let confirmEnv = ''
    let wroteFile = false
    let fileFinished = Promise.resolve()

    const form = busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: maxBytes,
      },
    })

    form.on('field', (name, value) => {
      if (name === 'confirmEnv') {
        confirmEnv = String(value ?? '')
      }
    })

    form.on('file', (name, stream, info) => {
      if (name !== 'file') {
        stream.resume()
        return
      }
      wroteFile = true
      const filename = info.filename || ''
      if (filename && !filename.toLowerCase().endsWith('.zip')) {
        stream.resume()
        fail(new DomainError('Upload a .zip backup file.'))
        return
      }
      fileFinished = pipeline(stream, createWriteStream(zipPath)).catch((error: unknown) => {
        fail(error instanceof Error ? error : new Error('Could not save the backup upload.'))
      })
      stream.on('limit', () => {
        fail(new DomainError('Backup is too large to restore.', 413))
      })
    })

    form.on('error', (error: Error) => {
      fail(error)
    })

    form.on('finish', () => {
      void fileFinished.then(() => {
        if (settled) {
          return
        }
        if (!wroteFile || !existsSync(zipPath)) {
          fail(new DomainError('Upload a .zip backup file.'))
          return
        }
        settled = true
        resolveUpload({ zipPath, confirmEnv })
      })
    })

    req.pipe(form)
  })
}

function sqliteFileUrl(sqlitePath: string) {
  return `file:${sqlitePath.replaceAll('\\', '/')}`
}

function addSiblingIfPresent(zip: ZipFile, sqlitePath: string, suffix: string) {
  const sibling = `${sqlitePath}${suffix}`
  if (existsSync(sibling)) {
    zip.addFile(sibling, `${BACKUP_SQLITE_ENTRY}${suffix}`)
  }
}

function collectUploadEntries(uploadsDir: string) {
  const entries: { absolute: string, zipName: string }[] = []
  if (!existsSync(uploadsDir)) {
    return { entries, names: [] as string[], count: 0 }
  }
  walkFiles(uploadsDir, (absolute, relativePath) => {
    const base = relativePath.split(/[\\/]/).pop() || relativePath
    if (isIsolationMarkerFileName(base)) {
      return
    }
    const zipName = `${BACKUP_UPLOADS_PREFIX}${relativePath.split(sep).join('/')}`
    entries.push({ absolute, zipName })
  })
  return {
    entries,
    names: entries.map(entry => entry.zipName),
    count: entries.length,
  }
}

function walkFiles(root: string, visit: (absolute: string, relativePath: string) => void) {
  const entries = readdirSync(root, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = join(root, entry.name)
    if (entry.isDirectory()) {
      walkFiles(absolute, (childAbsolute, childRelative) => {
        visit(childAbsolute, join(entry.name, childRelative))
      })
      continue
    }
    if (entry.isFile()) {
      visit(absolute, entry.name)
    }
  }
}

async function extractZip(zipPath: string, destDir: string) {
  const zipfile = await openPromise(zipPath, { lazyEntries: true })
  await new Promise<void>((resolveExtract, reject) => {
    const fail = (error: Error) => {
      try {
        zipfile.close()
      } catch {
        // Already closed.
      }
      reject(error)
    }

    zipfile.on('error', fail)
    zipfile.on('end', () => resolveExtract())
    zipfile.on('entry', (entry) => {
      void (async () => {
        const name = entry.fileName.replaceAll('\\', '/')
        if (name.endsWith('/')) {
          zipfile.readEntry()
          return
        }
        if (name.includes('..') || name.startsWith('/') || name.includes(':')) {
          throw new DomainError('Backup zip contains an unsafe path.')
        }
        const target = safeExtractPath(destDir, name)
        mkdirSync(dirname(target), { recursive: true })
        const stream = await zipfile.openReadStreamPromise(entry)
        await pipeline(stream, createWriteStream(target))
        zipfile.readEntry()
      })().catch(error => fail(error instanceof Error ? error : new Error('Could not read the backup zip.')))
    })
    zipfile.readEntry()
  })
}

function safeExtractPath(destDir: string, entryName: string) {
  const destRoot = resolve(destDir)
  const target = resolve(destRoot, normalize(entryName))
  const rel = relative(destRoot, target)
  if (!rel || rel.startsWith('..') || rel.split(sep).includes('..')) {
    throw new DomainError('Backup zip contains an unsafe path.')
  }
  return target
}

function readManifest(path: string): BackupManifest {
  if (!existsSync(path)) {
    throw new DomainError('Backup is missing manifest.json.')
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as BackupManifest
    if (!(BACKUP_SUPPORTED_MANIFEST_VERSIONS as readonly number[]).includes(parsed.version)) {
      throw new Error('unsupported version')
    }
    if (parsed.appEnv !== 'dev' && parsed.appEnv !== 'stage' && parsed.appEnv !== 'production') {
      throw new Error('unsupported env')
    }
    return parsed
  } catch (error) {
    if (error instanceof DomainError) {
      throw error
    }
    throw new DomainError('Backup manifest.json is invalid.')
  }
}

function assertSqliteFile(path: string) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new DomainError('Backup is missing the SQLite database.')
  }
  const header = Buffer.alloc(SQLITE_MAGIC.length)
  const fd = openSync(path, 'r')
  try {
    readSync(fd, header, 0, SQLITE_MAGIC.length, 0)
  } finally {
    closeSync(fd)
  }
  if (!header.equals(SQLITE_MAGIC)) {
    throw new DomainError('Backup SQLite file is not valid.')
  }
}

function replaceSqliteFiles(extractedSqlite: string, sqlitePath: string) {
  copyOver(extractedSqlite, sqlitePath)
  for (const suffix of ['-wal', '-shm'] as const) {
    const source = `${extractedSqlite}${suffix}`
    const dest = `${sqlitePath}${suffix}`
    if (existsSync(source)) {
      copyOver(source, dest)
    } else if (existsSync(dest)) {
      unlinkSync(dest)
    }
  }
}

function copyOver(from: string, to: string) {
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
}

function replaceUploads(extractedUploads: string, uploadsDir: string) {
  emptyDirectory(uploadsDir)
  if (!existsSync(extractedUploads)) {
    return
  }
  walkFiles(extractedUploads, (absolute, relativePath) => {
    const dest = join(uploadsDir, relativePath)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, readFileSync(absolute))
  })
}

function emptyDirectory(dir: string) {
  mkdirSync(dir, { recursive: true })
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true })
  }
}

export function restampIsolationFiles(uploadsDir: string, appEnv: AppEnv) {
  mkdirSync(uploadsDir, { recursive: true })
  for (const name of isolationMarkerFileNames()) {
    try {
      unlinkSync(join(uploadsDir, name))
    } catch {
      // Marker may not exist.
    }
  }
  writeFileSync(join(uploadsDir, isolationMarkerFileName(appEnv)), APP_ENV_ISOLATION_MARKERS[appEnv])
}

export async function restampIsolationSetting(sqlitePath: string, appEnv: AppEnv) {
  const marker = APP_ENV_ISOLATION_MARKERS[appEnv]
  const client = createClient({ url: sqliteFileUrl(sqlitePath) })
  try {
    await client.execute({
      sql: 'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
      args: ['m10a.isolation', marker, utcNowMs()],
    })
  } finally {
    client.close()
  }
}
