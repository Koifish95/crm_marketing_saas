import { randomUUID } from 'node:crypto'
import { constants, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../database'
import { environmentBackups, environments } from '../database/schema'
import {
  backupZipFileName,
  environmentBackupGuard,
  environmentRestoreGuard,
  existingBackupFileMessage,
  findSqliteFilename,
  fleetBackupRelativeDir,
  FLEET_BACKUP_RETENTION_DAYS,
  prodUpgradeBlocked,
  resolveFleetBackupFileName,
  restoreBackupPolicy,
  type RestoreBackupCandidate,
  type RestoreKind,
} from '../../shared/utils/fleet-backup'
import { getRegisteredEnvironment, listRegisteredEnvironments } from './registry'
import { restoreSnapshotToEnvironment, snapshotRegisteredEnvironment } from './fleet-backup-snapshot'
import { extractFleetBackupZip, extractedSqliteDir, extractedUploadsDir } from './fleet-backup-extract'
import { readFleetBackupManifest, writeFleetBackupZip } from './fleet-backup-zip'
import { composeArgs, composeRootForEnvironment, repoRoot, resolveComposeEnvFile } from './docker-relaunch'
import { inspectRegisteredContainer } from './docker-runtime'
import { currentReleaseId, imageBuildArgs, waitUntilHealthy } from './provision-runtime'
import { patchEnvFileContents } from './provision-env'
import { requireProduct } from '../products/catalog'
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

export function assertZipPathAvailable(zipPath: string, action: 'Backup' | 'Off-host copy') {
  if (existsSync(zipPath)) {
    throw new FleetBackupError(existingBackupFileMessage(action, basename(zipPath)), 409)
  }
  return zipPath
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
  const zipPath = assertZipPathAvailable(join(dir, zipName), 'Backup')
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

const OFFHOST_REMOTE_PATH = /^[A-Za-z0-9][A-Za-z0-9._-]{0,40}:[A-Za-z0-9][A-Za-z0-9._/-]*$/

export function assertOffhostRemotePath(value: string) {
  const path = value.trim()
  if (!OFFHOST_REMOTE_PATH.test(path) || path.includes('..')) {
    throw new FleetBackupError('Off-host remote path is not a verified rclone destination.', 400)
  }
  return path
}

export async function recordVerifiedOffhostRemote(
  db: Database,
  id: string,
  remotePath: string,
) {
  const row = requireEnvironment(await getRegisteredEnvironment(db, id))
  const latest = await latestEnvironmentBackup(db, row.id)
  if (!latest) {
    throw new FleetBackupError('No same-host backup exists for this environment.', 409)
  }
  const target = assertOffhostRemotePath(remotePath)
  const copiedAt = new Date().toISOString()
  await db.update(environmentBackups)
    .set({ offhostPath: target, offhostCopiedAt: copiedAt })
    .where(eq(environmentBackups.id, latest.id))
  return { ...latest, offhostPath: target, offhostCopiedAt: copiedAt }
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
  const target = assertZipPathAvailable(
    join(dest, latest.zipPath.split(/[/\\]/).at(-1) || `${row.id}.zip`),
    'Off-host copy',
  )
  try {
    copyFileSync(latest.zipPath, target, constants.COPYFILE_EXCL)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
      throw new FleetBackupError(existingBackupFileMessage('Off-host copy', basename(target)), 409)
    }
    throw error
  }
  const copiedAt = new Date().toISOString()
  await db.update(environmentBackups)
    .set({ offhostPath: target, offhostCopiedAt: copiedAt })
    .where(eq(environmentBackups.id, latest.id))
  return { ...latest, offhostPath: target, offhostCopiedAt: copiedAt }
}

export function restoreComposeArgs(input: {
  envFile: string
  composeFile: string
  composeProject?: string
}) {
  return composeArgs({
    envFile: input.envFile,
    composeFile: input.composeFile,
    composeProject: input.composeProject,
    recreate: false,
  })
}

function restoreRef(row: NonNullable<Awaited<ReturnType<typeof getRegisteredEnvironment>>>) {
  return {
    customerId: row.customer.id,
    productInstanceId: row.productInstance.id,
    environmentId: row.id,
    type: row.type,
  }
}

export function assertBackupMatchesSource(
  manifest: { environmentId: string, customerId: string },
  source: { id: string, customer: { id: string } },
) {
  if (manifest.environmentId !== source.id) {
    throw new FleetBackupError('Backup zip does not match the selected backup.', 409)
  }
  if (manifest.customerId !== source.customer.id) {
    throw new FleetBackupError('Backup zip does not match the selected customer account.', 409)
  }
}

export function summarizeRestoreCandidate(
  backup: {
    id: string
    createdAt: string
    bytes: number
    zipPath: string
    offhostPath: string | null
    offhostCopiedAt: string | null
  },
  source: NonNullable<Awaited<ReturnType<typeof getRegisteredEnvironment>>>,
  kind: RestoreKind,
  available: boolean,
): RestoreBackupCandidate {
  return {
    ...summarizeBackup(backup),
    zipFileName: backupZipFileName(backup.zipPath),
    available,
    kind,
    source: {
      environmentId: source.id,
      displayName: source.displayName,
      type: source.type,
      slug: source.slug,
      productInstanceId: source.productInstance.id,
      productDisplayName: source.productInstance.displayName,
      customerId: source.customer.id,
      customerDisplayName: source.customer.displayName,
    },
  }
}

export async function listRestorableBackups(
  db: Database,
  targetId: string,
  filesRoot = process.cwd(),
) {
  const target = requireEnvironment(await getRegisteredEnvironment(db, targetId))
  const fleet = await listRegisteredEnvironments(db)
  const envById = new Map(fleet.map(row => [row.id, row]))
  const rows = await db.select().from(environmentBackups).orderBy(desc(environmentBackups.createdAt))
  const backups: RestoreBackupCandidate[] = []
  for (const row of rows) {
    const source = envById.get(row.environmentId)
    if (!source) {
      continue
    }
    const decision = restoreBackupPolicy(restoreRef(source), restoreRef(target))
    if (!decision.allowed || decision.kind === 'rejected') {
      continue
    }
    let available = true
    try {
      assertRevealableZipPath(row.zipPath, filesRoot)
    } catch {
      available = false
    }
    backups.push(summarizeRestoreCandidate(row, source, decision.kind, available))
  }
  return {
    target: {
      id: target.id,
      displayName: target.displayName,
      type: target.type,
      slug: target.slug,
      containerName: target.containerName,
      hostPort: target.hostPort,
      composeProject: target.composeProject,
      sqliteVolume: target.sqliteVolume,
      assetsVolume: target.assetsVolume,
      productInstanceId: target.productInstance.id,
      productDisplayName: target.productInstance.displayName,
      customerId: target.customer.id,
      customerDisplayName: target.customer.displayName,
    },
    backups,
  }
}

export async function resolveRestoreRequest(
  db: Database,
  targetId: string,
  backupId: string,
  filesRoot = process.cwd(),
) {
  const idValue = backupId.trim()
  if (!idValue) {
    throw new FleetBackupError('backupId is required.', 400)
  }
  const target = requireEnvironment(await getRegisteredEnvironment(db, targetId))
  const restoreGuard = environmentRestoreGuard(target)
  if (restoreGuard) {
    throw new FleetBackupError(restoreGuard.statusMessage, restoreGuard.statusCode)
  }
  const [backup] = await db.select().from(environmentBackups)
    .where(eq(environmentBackups.id, idValue))
    .limit(1)
  if (!backup) {
    throw new FleetBackupError('Backup is not registered.', 404)
  }
  const source = await getRegisteredEnvironment(db, backup.environmentId)
  if (!source) {
    throw new FleetBackupError('Backup source environment is not registered.', 404)
  }
  const decision = restoreBackupPolicy(restoreRef(source), restoreRef(target))
  if (!decision.allowed || decision.kind === 'rejected') {
    throw new FleetBackupError(decision.reason, 409)
  }
  const zipPath = assertRevealableZipPath(backup.zipPath, filesRoot)
  return {
    target,
    source,
    backup,
    zipPath,
    kind: decision.kind,
  }
}

export async function restoreRegisteredEnvironment(
  db: Database,
  id: string,
  confirm: boolean,
  backupId: string,
  filesRoot = process.cwd(),
) {
  if (!confirm) {
    throw new FleetBackupError('Type confirm to replace this environment’s data.', 400)
  }
  const resolved = await resolveRestoreRequest(db, id, backupId, filesRoot)
  const extractDir = join(tmpdir(), `fleet-restore-${randomUUID()}`)
  mkdirSync(extractDir, { recursive: true })
  const registered = (await listRegisteredEnvironments(db)).map(item => item.containerName)
  try {
    await extractFleetBackupZip(resolved.zipPath, extractDir)
    const manifest = readFleetBackupManifest(extractDir)
    assertBackupMatchesSource(manifest, resolved.source)
    const sqliteDir = extractedSqliteDir(extractDir)
    findSqliteFilename(readdirSync(sqliteDir))
    restoreSnapshotToEnvironment({
      containerName: resolved.target.containerName,
      sqliteVolume: resolved.target.sqliteVolume,
      assetsVolume: resolved.target.assetsVolume,
      sqliteDir,
      uploadsDir: extractedUploadsDir(extractDir),
      registeredNames: registered,
    })
    if (inspectRegisteredContainer(resolved.target.containerName, registered) === 'running') {
      const restarted = spawnSync('docker', ['restart', resolved.target.containerName], {
        encoding: 'utf8',
        windowsHide: true,
      })
      if (restarted.status !== 0) {
        throw new FleetBackupError(
          restarted.stderr?.trim() || restarted.stdout?.trim() || 'Restore container restart failed.',
          500,
        )
      }
    }
    const envFile = resolveComposeEnvFile({
      envFileLocal: resolved.target.envFileLocal,
      envFileExample: resolved.target.envFileExample,
      root: composeRootForEnvironment(resolved.target),
    })
    const up = restoreComposeArgs({
      envFile,
      composeFile: resolved.target.composeFile,
      composeProject: resolved.target.composeProject,
    })
    if (up.some(part => part === '-v' || part === '--volumes' || part === 'down' || part === 'prune')) {
      throw new FleetBackupError('Refusing a forbidden Docker argument.', 500)
    }
    const started = spawnSync('docker', up, {
      cwd: composeRootForEnvironment(resolved.target),
      encoding: 'utf8',
      windowsHide: true,
    })
    if (started.status !== 0) {
      throw new FleetBackupError(started.stderr?.trim() || started.stdout?.trim() || 'Restore compose up failed.', 500)
    }
    await waitUntilHealthy(resolved.target.healthUrl)
    return {
      environmentId: resolved.target.id,
      backupId: resolved.backup.id,
      zipPath: resolved.zipPath,
      kind: resolved.kind,
      target: {
        id: resolved.target.id,
        containerName: resolved.target.containerName,
        hostPort: resolved.target.hostPort,
        composeProject: resolved.target.composeProject,
        sqliteVolume: resolved.target.sqliteVolume,
        assetsVolume: resolved.target.assetsVolume,
      },
    }
  } finally {
    rmSync(extractDir, { recursive: true, force: true })
  }
}

function isAcmeLab(composeFile: string) {
  return composeFile.startsWith('docker-compose.lab-acme')
}

export function upgradeComposeArgs(input: {
  envFile: string
  composeFile: string
  composeProject?: string
}) {
  return composeArgs({
    envFile: input.envFile,
    composeFile: input.composeFile,
    composeProject: input.composeProject,
    recreate: true,
  })
}

export function writeUpgradeEnv(
  envFile: string,
  expectedImage: string,
  releaseId = currentReleaseId(),
) {
  if (!existsSync(envFile)) {
    throw new FleetBackupError(`Env file missing: ${envFile}`, 500)
  }
  const next = patchEnvFileContents(readFileSync(envFile, 'utf8'), {
    EXPECTED_IMAGE: expectedImage,
    RELEASE_ID: releaseId,
  })
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
  const siblings = fleet.filter(item => item.productInstance.id === row.productInstance.id)
  if (row.type === 'PROD' && prodUpgradeBlocked(siblings, target, isAcmeLab(row.composeFile))) {
    throw new FleetBackupError('Upgrade a non-PROD environment to this image first.', 409)
  }
  const previousImage = row.expectedImage
  const product = requireProduct(row.productInstance.productId)
  const releaseId = currentReleaseId()
  const built = spawnSync('docker', imageBuildArgs(target, product.dockerfile), {
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
    root: composeRootForEnvironment(row),
  })
  const absoluteEnvFile = isAbsolute(row.envFileLocal) ? row.envFileLocal : envFile
  const previousEnv = existsSync(absoluteEnvFile) ? readFileSync(absoluteEnvFile, 'utf8') : ''
  writeUpgradeEnv(absoluteEnvFile, target, releaseId)
  const up = upgradeComposeArgs({
    envFile,
    composeFile: row.composeFile,
    composeProject: row.composeProject,
  })
  const result = spawnSync('docker', up, {
    cwd: composeRootForEnvironment(row),
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    if (previousEnv) {
      writeFileSync(absoluteEnvFile, previousEnv)
    }
    throw new FleetBackupError(result.stderr?.trim() || result.stdout?.trim() || 'Upgrade compose up failed.', 500)
  }
  await db.update(environments).set({ expectedImage: target }).where(eq(environments.id, row.id))
  const health = await waitUntilHealthy(row.healthUrl)
  return {
    environmentId: row.id,
    previousImage,
    expectedImage: target,
    backupId: latest.id,
    releaseId: health.releaseId || releaseId,
    schemaVersion: health.schemaVersion || null,
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
