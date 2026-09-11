import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { tmpdir } from 'node:os'
import { desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import { environmentBackups, environments } from '../database/schema'
import {
  environmentBackupGuard,
  fleetBackupFileName,
  fleetBackupRelativeDir,
  FLEET_BACKUP_RETENTION_DAYS,
  prodUpgradeBlocked,
} from '../../shared/utils/fleet-backup'
import { getRegisteredEnvironment, listRegisteredEnvironments } from './registry'
import { restoreSnapshotToEnvironment, snapshotRegisteredEnvironment } from './fleet-backup-snapshot'
import { extractFleetBackupZip, extractedSqliteDir, extractedUploadsDir } from './fleet-backup-extract'
import { readFleetBackupManifest, writeFleetBackupZip } from './fleet-backup-zip'
import { composeArgs, repoRoot, resolveComposeEnvFile, templateRoot } from './docker-relaunch'
import { imageBuildArgs, waitUntilHealthy } from './provision-runtime'
import { spawnSync } from 'node:child_process'

export class FleetBackupError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export function fleetBackupRoot(cwd = process.cwd()) {
  return join(cwd, 'data', 'backups')
}

function requireEnvironment(row: Awaited<ReturnType<typeof getRegisteredEnvironment>>) {
  const guard = environmentBackupGuard(row)
  if (guard) {
    throw new FleetBackupError(guard.statusMessage, guard.statusCode)
  }
  return row!
}

export async function listEnvironmentBackups(db: Database, environmentId: string) {
  return db.select().from(environmentBackups)
    .where(eq(environmentBackups.environmentId, environmentId))
    .orderBy(desc(environmentBackups.createdAt))
}

export async function latestEnvironmentBackup(db: Database, environmentId: string) {
  const rows = await listEnvironmentBackups(db, environmentId)
  return rows[0] ?? null
}

export async function latestBackupsByEnvironment(db: Database) {
  const rows = await db.select().from(environmentBackups).orderBy(desc(environmentBackups.createdAt))
  const byId = new Map<string, typeof rows[number]>()
  for (const row of rows) {
    if (!byId.has(row.environmentId)) {
      byId.set(row.environmentId, row)
    }
  }
  return byId
}

async function pruneOldBackups(db: Database, environmentId: string) {
  const rows = await listEnvironmentBackups(db, environmentId)
  const cutoff = Date.now() - FLEET_BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000
  for (const row of rows) {
    if (Date.parse(row.createdAt) >= cutoff) {
      continue
    }
    try {
      rmSync(row.zipPath, { force: true })
    } catch {
      // keep registry row if delete fails
    }
    await db.delete(environmentBackups).where(eq(environmentBackups.id, row.id))
  }
}

export async function backupRegisteredEnvironment(db: Database, id: string, filesRoot = process.cwd()) {
  const row = requireEnvironment(await getRegisteredEnvironment(db, id))
  const registered = (await listRegisteredEnvironments(db)).map(item => item.containerName)
  const snapshot = snapshotRegisteredEnvironment({
    containerName: row.containerName,
    sqliteVolume: row.sqliteVolume,
    assetsVolume: row.assetsVolume,
    registeredNames: registered,
  })
  const createdAt = new Date().toISOString()
  const relativeDir = fleetBackupRelativeDir(row.customer.id, row.id)
  const zipName = fleetBackupFileName(row.id, createdAt)
  const zipPath = join(filesRoot, relativeDir, zipName)
  mkdirSync(join(filesRoot, relativeDir), { recursive: true })
  try {
    const written = await writeFleetBackupZip({
      zipPath,
      sqlitePath: snapshot.sqlitePath,
      sqliteFilename: snapshot.sqliteFilename,
      uploadsDir: snapshot.uploadsDir,
      customerId: row.customer.id,
      environmentId: row.id,
      createdAt,
    })
    const record = {
      id: randomUUID(),
      environmentId: row.id,
      customerId: row.customer.id,
      createdAt,
      bytes: written.bytes,
      zipPath,
      sqliteFilename: snapshot.sqliteFilename,
      offhostPath: null,
      offhostCopiedAt: null,
      previousExpectedImage: row.expectedImage,
    }
    await db.insert(environmentBackups).values(record)
    await pruneOldBackups(db, row.id)
    return record
  } finally {
    rmSync(snapshot.dest, { recursive: true, force: true })
  }
}

export async function copyEnvironmentBackupOffhost(
  db: Database,
  id: string,
  destinationDir: string,
) {
  const row = requireEnvironment(await getRegisteredEnvironment(db, id))
  const latest = await latestEnvironmentBackup(db, row.id)
  if (!latest) {
    throw new FleetBackupError('No same-host backup exists for this environment.', 409)
  }
  const dest = destinationDir.trim()
  if (!dest || !existsSync(dest) || !statSync(dest).isDirectory()) {
    throw new FleetBackupError('Off-host destination folder does not exist.', 400)
  }
  const target = join(dest, latest.zipPath.split(/[/\\]/).at(-1) || `${row.id}.zip`)
  copyFileSync(latest.zipPath, target)
  const copiedAt = new Date().toISOString()
  await db.update(environmentBackups)
    .set({ offhostPath: target, offhostCopiedAt: copiedAt })
    .where(eq(environmentBackups.id, latest.id))
  return { ...latest, offhostPath: target, offhostCopiedAt: copiedAt }
}

export async function restoreRegisteredEnvironment(
  db: Database,
  id: string,
  confirm: boolean,
  zipPath?: string,
) {
  if (!confirm) {
    throw new FleetBackupError('Type confirm to replace this environment’s data.', 400)
  }
  const row = requireEnvironment(await getRegisteredEnvironment(db, id))
  const source = zipPath?.trim() || (await latestEnvironmentBackup(db, row.id))?.zipPath
  if (!source || !existsSync(source)) {
    throw new FleetBackupError('Backup zip is missing.', 404)
  }
  const extractDir = join(tmpdir(), `fleet-restore-${randomUUID()}`)
  mkdirSync(extractDir, { recursive: true })
  const registered = (await listRegisteredEnvironments(db)).map(item => item.containerName)
  try {
    await extractFleetBackupZip(source, extractDir)
    const manifest = readFleetBackupManifest(extractDir)
    if (manifest.environmentId !== row.id) {
      throw new FleetBackupError('Backup zip belongs to a different environment.', 409)
    }
    restoreSnapshotToEnvironment({
      containerName: row.containerName,
      sqliteVolume: row.sqliteVolume,
      assetsVolume: row.assetsVolume,
      sqliteDir: extractedSqliteDir(extractDir),
      uploadsDir: extractedUploadsDir(extractDir),
      registeredNames: registered,
    })
    const envFile = resolveComposeEnvFile({
      envFileLocal: row.envFileLocal,
      envFileExample: row.envFileExample,
    })
    const up = composeArgs({
      envFile,
      composeFile: row.composeFile,
      composeProject: row.composeProject,
      recreate: false,
    })
    const started = spawnSync('docker', up, {
      cwd: templateRoot(),
      encoding: 'utf8',
      windowsHide: true,
    })
    if (started.status !== 0) {
      throw new FleetBackupError(started.stderr?.trim() || started.stdout?.trim() || 'Restore compose up failed.', 500)
    }
    await waitUntilHealthy(row.healthUrl)
    return { environmentId: row.id, zipPath: source }
  } finally {
    rmSync(extractDir, { recursive: true, force: true })
  }
}

function isAcmeLab(composeFile: string) {
  return composeFile.startsWith('docker-compose.lab-acme')
}

function writeExpectedImage(envFile: string, expectedImage: string) {
  if (!existsSync(envFile)) {
    throw new FleetBackupError(`Env file missing: ${envFile}`, 500)
  }
  const next = readFileSync(envFile, 'utf8').replace(
    /^EXPECTED_IMAGE=.*$/m,
    `EXPECTED_IMAGE="${expectedImage.replaceAll('"', '\\"')}"`,
  )
  writeFileSync(envFile, next)
}

export async function upgradeRegisteredEnvironment(
  db: Database,
  id: string,
  expectedImage?: string,
) {
  const row = requireEnvironment(await getRegisteredEnvironment(db, id))
  const latest = await latestEnvironmentBackup(db, row.id)
  if (!latest) {
    throw new FleetBackupError('Refuse upgrade without an S6 backup of this environment.', 409)
  }
  const target = (expectedImage || row.expectedImage).trim()
  if (!target) {
    throw new FleetBackupError('expectedImage is required.', 400)
  }
  const fleet = await listRegisteredEnvironments(db)
  const siblings = fleet.filter(item => item.customer.id === row.customer.id)
  if (row.type === 'PROD' && prodUpgradeBlocked(siblings, target, isAcmeLab(row.composeFile))) {
    throw new FleetBackupError('Upgrade a non-PROD environment to this image first.', 409)
  }
  const previousImage = row.expectedImage
  const built = spawnSync('docker', imageBuildArgs(target), {
    cwd: repoRoot(),
    encoding: 'utf8',
    windowsHide: true,
  })
  if (built.status !== 0) {
    throw new FleetBackupError(built.stderr?.trim() || built.stdout?.trim() || 'Local image build failed.', 500)
  }
  const envFile = resolveComposeEnvFile({
    envFileLocal: row.envFileLocal,
    envFileExample: row.envFileExample,
  })
  writeExpectedImage(isAbsolute(row.envFileLocal) ? row.envFileLocal : envFile, target)
  const up = composeArgs({
    envFile,
    composeFile: row.composeFile,
    composeProject: row.composeProject,
    recreate: false,
  })
  const result = spawnSync('docker', up, {
    cwd: templateRoot(),
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new FleetBackupError(result.stderr?.trim() || result.stdout?.trim() || 'Upgrade compose up failed.', 500)
  }
  await db.update(environments).set({ expectedImage: target }).where(eq(environments.id, row.id))
  await waitUntilHealthy(row.healthUrl)
  return {
    environmentId: row.id,
    previousImage,
    expectedImage: target,
    backupId: latest.id,
  }
}

export function summarizeBackup(row: {
  id: string
  createdAt: string
  bytes: number
  zipPath: string
  offhostPath: string | null
  offhostCopiedAt: string | null
}) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    bytes: row.bytes,
    zipPath: row.zipPath,
    offhostPath: row.offhostPath,
    offhostCopiedAt: row.offhostCopiedAt,
  }
}
