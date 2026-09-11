import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import { environmentBackups, environments } from '../database/schema'
import {
  environmentBackupGuard,
  fleetBackupRelativeDir,
  FLEET_BACKUP_RETENTION_DAYS,
  prodUpgradeBlocked,
  resolveFleetBackupFileName,
} from '../../shared/utils/fleet-backup'
import { getRegisteredEnvironment, listRegisteredEnvironments } from './registry'
import { restoreSnapshotToEnvironment, snapshotRegisteredEnvironment } from './fleet-backup-snapshot'
import { extractFleetBackupZip, extractedSqliteDir, extractedUploadsDir } from './fleet-backup-extract'
import { readFleetBackupManifest, writeFleetBackupZip } from './fleet-backup-zip'
import { composeArgs, repoRoot, resolveComposeEnvFile, templateRoot } from './docker-relaunch'
import { imageBuildArgs, waitUntilHealthy } from './provision-runtime'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'

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
  const relativeDir = fleetBackupRelativeDir(row.customer.slug, row.slug)
  const dir = join(filesRoot, relativeDir)
  mkdirSync(dir, { recursive: true })
  const zipName = resolveFleetBackupFileName(
    row.customer.slug,
    row.slug,
    createdAt,
    row.customer.timezone,
    name => existsSync(join(dir, name)),
  )
  const zipPath = join(dir, zipName)
  try {
    const written = await writeFleetBackupZip({
      zipPath,
      sqlitePath: snapshot.sqlitePath,
      sqliteFilename: snapshot.sqliteFilename,
      uploadsDir: snapshot.uploadsDir,
      customerId: row.customer.id,
      customerSlug: row.customer.slug,
      customerDisplayName: row.customer.displayName,
      environmentId: row.id,
      environmentSlug: row.slug,
      environmentDisplayName: row.displayName,
      environmentType: row.type,
      containerName: row.containerName,
      timeZone: row.customer.timezone,
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

export function isPathInsideBackupRoot(zipPath: string, filesRoot = process.cwd()) {
  const root = resolve(fleetBackupRoot(filesRoot))
  const resolved = resolve(zipPath)
  const rel = relative(root, resolved)
  return Boolean(rel) && !rel.startsWith('..') && !rel.split(sep).includes('..') && !isAbsolute(rel)
}

export function assertRevealableZipPath(zipPath: string, filesRoot = process.cwd()) {
  const resolved = resolve(zipPath)
  if (!isPathInsideBackupRoot(resolved, filesRoot)) {
    throw new FleetBackupError('Backup zip is outside the same-host backup store.', 403)
  }
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new FleetBackupError('Backup zip is missing.', 404)
  }
  return resolved
}

export function revealBackupCommand(platform: NodeJS.Platform, zipPath: string) {
  if (platform === 'win32') {
    return { command: 'explorer.exe', args: [`/select,${zipPath}`] }
  }
  if (platform === 'darwin') {
    return { command: 'open', args: ['-R', zipPath] }
  }
  return { command: 'xdg-open', args: [dirname(zipPath)] }
}

export function openBackupInExplorer(
  zipPath: string,
  platform: NodeJS.Platform = process.platform,
  spawnFn: typeof spawn = spawn,
) {
  const { command, args } = revealBackupCommand(platform, zipPath)
  const child: ChildProcess = spawnFn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  })
  child.unref()
  return { command, args }
}

export async function revealEnvironmentBackup(
  db: Database,
  id: string,
  backupId: string,
  options: {
    filesRoot?: string
    open?: (zipPath: string) => { command: string, args: string[] }
  } = {},
) {
  const row = requireEnvironment(await getRegisteredEnvironment(db, id))
  const idValue = backupId.trim()
  if (!idValue) {
    throw new FleetBackupError('backupId is required.', 400)
  }
  const [backup] = await db.select().from(environmentBackups)
    .where(and(eq(environmentBackups.id, idValue), eq(environmentBackups.environmentId, row.id)))
    .limit(1)
  if (!backup) {
    throw new FleetBackupError('Backup is not registered for this environment.', 404)
  }
  const zipPath = assertRevealableZipPath(backup.zipPath, options.filesRoot)
  const opened = (options.open || openBackupInExplorer)(zipPath)
  return { zipPath, backupId: backup.id, command: opened.command, args: opened.args }
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
