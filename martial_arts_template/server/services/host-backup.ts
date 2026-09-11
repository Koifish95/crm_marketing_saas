import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppEnv } from '@crm/core/shared/utils/app-env'
import {
  BACKUP_RETENTION_DAYS,
  DEFAULT_HOST_BACKUP_DIR,
  HOST_BACKUP_STATUS_FILE,
  backupStamp,
  hostBackupEnvName,
} from '../../shared/utils/backup'
import { utcNowMs } from '../../shared/utils/time'
import {
  type BackupManifest,
  assertRestoreConfirmation,
  restoreBackupArchive,
  validateBackupArchive,
  writeBackupArchive,
} from './environment-backup'
import { DomainError } from './errors'

function repoRoot() {
  const metaUrl = import.meta.url
  if (typeof metaUrl === 'string' && metaUrl.length > 0) {
    return resolve(dirname(fileURLToPath(metaUrl)), '../..')
  }
  return process.cwd()
}

export type HostBackupRecord = {
  appEnv: AppEnv
  zipPath: string
  directory: string
  filename: string
  createdAt: number
  bytes: number
  manifest: BackupManifest
}

export type HostBackupStatus = {
  nextScheduledAt?: number
  lastSuccess?: {
    appEnv: AppEnv
    operation: 'backup' | 'restore' | 'prune'
    path?: string
    at: number
    bytes?: number
  }
  lastFailure?: {
    appEnv: AppEnv
    operation: 'backup' | 'restore' | 'prune'
    at: number
    message: string
  }
  lastPrune?: {
    appEnv: AppEnv
    at: number
    removed: number
    kept: number
  }
}

export function hostBackupRoot(env: NodeJS.Dict<string | undefined> = process.env) {
  const raw = env.APP_BACKUP_DIR?.trim()
  return resolve(raw || join(repoRoot(), DEFAULT_HOST_BACKUP_DIR))
}

export function hostBackupEnvDir(appEnv: AppEnv, root = hostBackupRoot()) {
  return join(root, hostBackupEnvName(appEnv))
}

export function hostBackupStatusPath(root = hostBackupRoot()) {
  return join(root, HOST_BACKUP_STATUS_FILE)
}

export async function createHostBackup(input: {
  appEnv: AppEnv
  sqlitePath: string
  uploadsDir: string
  nowMs?: number
  databaseUrl?: string
  root?: string
}) {
  const nowMs = input.nowMs ?? utcNowMs()
  const root = input.root ?? hostBackupRoot()
  const directory = join(hostBackupEnvDir(input.appEnv, root), backupStamp(nowMs))
  mkdirSync(directory, { recursive: true })
  const filename = `martial-arts-${input.appEnv}-${backupStamp(nowMs)}.zip`
  const zipPath = join(directory, filename)

  try {
    const written = await writeBackupArchive(zipPath, {
      sqlitePath: input.sqlitePath,
      uploadsDir: input.uploadsDir,
      appEnv: input.appEnv,
      nowMs,
      databaseUrl: input.databaseUrl,
    })
    const record: HostBackupRecord = {
      appEnv: input.appEnv,
      zipPath,
      directory,
      filename: written.filename,
      createdAt: written.manifest.createdAt,
      bytes: written.bytes,
      manifest: written.manifest,
    }
    writeFileSync(join(directory, 'manifest.json'), `${JSON.stringify(written.manifest, null, 2)}\n`)
    recordBackupStatus(root, {
      lastSuccess: {
        appEnv: input.appEnv,
        operation: 'backup',
        path: zipPath,
        at: nowMs,
        bytes: written.bytes,
      },
    })
    return record
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    recordBackupStatus(root, {
      lastFailure: {
        appEnv: input.appEnv,
        operation: 'backup',
        at: nowMs,
        message: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

export function listHostBackups(appEnv: AppEnv, root = hostBackupRoot()): HostBackupRecord[] {
  const envDir = hostBackupEnvDir(appEnv, root)
  if (!existsSync(envDir)) {
    return []
  }
  const records: HostBackupRecord[] = []
  for (const name of readdirSync(envDir)) {
    const directory = join(envDir, name)
    if (!statSync(directory).isDirectory()) {
      continue
    }
    const zip = readdirSync(directory).find(file => file.toLowerCase().endsWith('.zip'))
    if (!zip) {
      continue
    }
    const zipPath = join(directory, zip)
    const sidecar = join(directory, 'manifest.json')
    let manifest: BackupManifest | undefined
    if (existsSync(sidecar)) {
      try {
        manifest = JSON.parse(readFileSync(sidecar, 'utf8')) as BackupManifest
      } catch {
        manifest = undefined
      }
    }
    records.push({
      appEnv,
      zipPath,
      directory,
      filename: zip,
      createdAt: manifest?.createdAt || statSync(zipPath).mtimeMs,
      bytes: statSync(zipPath).size,
      manifest: manifest || {
        version: 1,
        appEnv,
        createdAt: statSync(zipPath).mtimeMs,
      },
    })
  }
  return records.sort((a, b) => b.createdAt - a.createdAt)
}

export function pruneHostBackups(input: {
  appEnv: AppEnv
  nowMs?: number
  retentionDays?: number
  keepPaths?: string[]
  root?: string
}) {
  if (input.appEnv !== 'production') {
    return { removed: 0, kept: 0, removedPaths: [] as string[] }
  }
  const nowMs = input.nowMs ?? utcNowMs()
  const retentionDays = input.retentionDays ?? BACKUP_RETENTION_DAYS
  const cutoff = nowMs - (retentionDays * 24 * 60 * 60 * 1000)
  const keep = new Set(input.keepPaths || [])
  const records = listHostBackups(input.appEnv, input.root)
  const removedPaths: string[] = []
  let kept = 0
  for (const record of records) {
    if (keep.has(record.zipPath) || record.createdAt >= cutoff) {
      kept += 1
      continue
    }
    rmSync(record.directory, { recursive: true, force: true })
    removedPaths.push(record.zipPath)
  }
  recordBackupStatus(input.root ?? hostBackupRoot(), {
    lastPrune: {
      appEnv: input.appEnv,
      at: nowMs,
      removed: removedPaths.length,
      kept,
    },
  })
  return { removed: removedPaths.length, kept, removedPaths }
}

export function readBackupStatus(root = hostBackupRoot()): HostBackupStatus {
  const path = hostBackupStatusPath(root)
  if (!existsSync(path)) {
    return {}
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as HostBackupStatus
  } catch {
    return {}
  }
}

export function recordBackupStatus(root: string, patch: HostBackupStatus) {
  mkdirSync(root, { recursive: true })
  const current = readBackupStatus(root)
  writeFileSync(hostBackupStatusPath(root), `${JSON.stringify({ ...current, ...patch }, null, 2)}\n`)
}

export async function assertHostBackupValid(zipPath: string) {
  if (!existsSync(zipPath)) {
    throw new DomainError(`Backup not found: ${zipPath}`)
  }
  return validateBackupArchive(zipPath)
}

export async function restoreHostBackup(input: {
  zipPath: string
  appEnv: AppEnv
  confirmEnv: string
  sqlitePath: string
  uploadsDir: string
  databaseUrl?: string
  root?: string
}) {
  const root = input.root ?? hostBackupRoot()
  try {
    assertRestoreConfirmation(input.confirmEnv, input.appEnv)
    const validated = await assertHostBackupValid(input.zipPath)
    const result = await restoreBackupArchive({
      zipPath: input.zipPath,
      sqlitePath: input.sqlitePath,
      uploadsDir: input.uploadsDir,
      appEnv: input.appEnv,
      databaseUrl: input.databaseUrl,
    })
    recordBackupStatus(root, {
      lastSuccess: {
        appEnv: input.appEnv,
        operation: 'restore',
        path: input.zipPath,
        at: utcNowMs(),
      },
    })
    return {
      sourceAppEnv: result.sourceAppEnv,
      manifest: validated.manifest,
      zipPath: input.zipPath,
    }
  } catch (error) {
    recordBackupStatus(root, {
      lastFailure: {
        appEnv: input.appEnv,
        operation: 'restore',
        at: utcNowMs(),
        message: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}
