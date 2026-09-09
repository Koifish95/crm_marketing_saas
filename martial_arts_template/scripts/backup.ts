import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_ENV_HOST_PORTS, APP_ENVS, type AppEnv } from '../shared/utils/app-env'
import { BACKUP_RETENTION_DAYS, BACKUP_SCHEDULE_HOUR, BACKUP_SCHEDULE_MINUTE, BACKUP_SCHEDULE_TIMEZONE, nextScheduledBackupMs } from '../shared/utils/backup'
import { createHostBackup, listHostBackups, pruneHostBackups, readBackupStatus, recordBackupStatus, restoreHostBackup, hostBackupRoot } from '../server/services/host-backup'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DOCKER_ENVS: Record<AppEnv, {
  container: string
  sqliteVolume: string
  assetVolume: string
}> = {
  production: {
    container: 'martial-arts-prod-app-1',
    sqliteVolume: 'martial-arts-prod-sqlite',
    assetVolume: 'martial-arts-prod-assets',
  },
  stage: {
    container: 'martial-arts-stage-app-1',
    sqliteVolume: 'martial-arts-stage-sqlite',
    assetVolume: 'martial-arts-stage-assets',
  },
  dev: {
    container: 'martial-arts-dev-app-1',
    sqliteVolume: 'martial-arts-dev-sqlite',
    assetVolume: 'martial-arts-dev-assets',
  },
}

function usage(exitCode = 1): never {
  console.error('Usage: pnpm backup:<env>   or   pnpm exec tsx scripts/backup.ts backup <dev|stage|production>')
  console.error('       pnpm backup:status')
  console.error('       pnpm backup:restore -- --env <dev|stage|production> --from <zip> --confirm-env <same>')
  console.error('       pnpm backup:prune')
  console.error('       pnpm backup:schedule [-- --once]')
  process.exit(exitCode)
}

function flag(name: string, argv: string[]) {
  const index = argv.indexOf(name)
  if (index < 0) {
    return undefined
  }
  return argv[index + 1]
}

function parseAppEnv(raw: string | undefined): AppEnv {
  if (raw === 'prod') {
    return 'production'
  }
  if (raw && (APP_ENVS as readonly string[]).includes(raw)) {
    return raw as AppEnv
  }
  usage()
}

function docker(args: string[], options: { inherit?: boolean } = {}) {
  return spawnSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    shell: false,
    windowsHide: true,
  })
}

function containerRunning(name: string) {
  const result = docker(['inspect', '-f', '{{.State.Running}}', name])
  return result.status === 0 && String(result.stdout).trim() === 'true'
}

function volumeExists(name: string) {
  return docker(['volume', 'inspect', name]).status === 0
}

function checkpointContainer(container: string) {
  const result = docker(['exec', container, 'node', 'docker/db-marker.cjs', 'checkpoint'])
  if (result.status !== 0) {
    console.warn('[martial-arts] container checkpoint helper unavailable; copying after volume snapshot')
    return false
  }
  return true
}

function copyFromContainer(container: string, dest: string) {
  mkdirSync(join(dest, 'sqlite'), { recursive: true })
  mkdirSync(join(dest, 'uploads'), { recursive: true })
  const sqlite = docker(['cp', `${container}:/app/data/sqlite/.`, join(dest, 'sqlite')])
  if (sqlite.status !== 0) {
    throw new Error(sqlite.stderr || 'Could not copy SQLite from the container.')
  }
  docker(['cp', `${container}:/app/data/uploads/.`, join(dest, 'uploads')])
}

function copyFromVolume(volume: string, dest: string) {
  mkdirSync(dest, { recursive: true })
  const helper = `ma-backup-copy-${Date.now()}`
  docker(['rm', '-f', helper])
  const run = docker(['run', '-d', '--name', helper, '-v', `${volume}:/src`, 'alpine:3.20', 'sleep', '60'])
  if (run.status !== 0) {
    throw new Error(run.stderr || `Could not mount volume ${volume}.`)
  }
  try {
    const copied = docker(['cp', `${helper}:/src/.`, dest])
    if (copied.status !== 0) {
      throw new Error(copied.stderr || `Could not copy volume ${volume}.`)
    }
  } finally {
    docker(['rm', '-f', helper])
  }
}

function snapshotEnvironment(appEnv: AppEnv) {
  const dest = join(tmpdir(), `ma-host-backup-${appEnv}-${Date.now()}`)
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  const config = DOCKER_ENVS[appEnv]
  if (containerRunning(config.container)) {
    console.info(`[martial-arts] checkpointing ${config.container} (PRAGMA wal_checkpoint(TRUNCATE))`)
    checkpointContainer(config.container)
    console.info(`[martial-arts] copying files from ${config.container}`)
    copyFromContainer(config.container, dest)
  } else if (volumeExists(config.sqliteVolume)) {
    console.info(`[martial-arts] ${config.container} is not running; copying named volumes`)
    copyFromVolume(config.sqliteVolume, join(dest, 'sqlite'))
    if (volumeExists(config.assetVolume)) {
      copyFromVolume(config.assetVolume, join(dest, 'uploads'))
    } else {
      mkdirSync(join(dest, 'uploads'), { recursive: true })
    }
  } else {
    throw new Error(`No running ${appEnv} container or ${config.sqliteVolume} volume. Start it with pnpm env:up.`)
  }
  const sqlitePath = join(dest, 'sqlite', 'app.sqlite')
  if (!existsSync(sqlitePath)) {
    throw new Error(`Snapshot is missing ${sqlitePath}`)
  }
  return {
    dest,
    sqlitePath,
    uploadsDir: join(dest, 'uploads'),
    databaseUrl: `file:${sqlitePath.replaceAll('\\', '/')}`,
  }
}

async function backupEnvironment(appEnv: AppEnv) {
  console.info(`[martial-arts] starting ${appEnv} backup`)
  console.info(`[martial-arts] backups stay on this host under data/backups/${appEnv}/ (not off-site)`)
  const snapshot = snapshotEnvironment(appEnv)
  try {
    const record = await createHostBackup({
      appEnv,
      sqlitePath: snapshot.sqlitePath,
      uploadsDir: snapshot.uploadsDir,
      databaseUrl: snapshot.databaseUrl,
    })
    console.info(`[martial-arts] backup ok ${record.zipPath}`)
    console.info(`[martial-arts] bytes=${record.bytes} createdAt=${record.createdAt} uploads=${record.manifest.uploadCount ?? 0}`)
    return record
  } finally {
    try {
      rmSync(snapshot.dest, { recursive: true, force: true, maxRetries: 8, retryDelay: 50 })
    } catch (error) {
      console.warn(`[martial-arts] left snapshot temp dir ${snapshot.dest}: ${error instanceof Error ? error.message : error}`)
    }
  }
}

function stopContainer(name: string) {
  if (!containerRunning(name)) {
    return
  }
  console.info(`[martial-arts] stopping ${name}`)
  docker(['stop', name], { inherit: true })
}

function startContainer(name: string) {
  console.info(`[martial-arts] starting ${name}`)
  const result = docker(['start', name], { inherit: true })
  if (result.status !== 0) {
    throw new Error(`Could not start ${name}`)
  }
}

function copyDirIntoVolume(hostDir: string, volume: string) {
  if (!volumeExists(volume)) {
    const created = docker(['volume', 'create', volume])
    if (created.status !== 0) {
      throw new Error(`Could not create volume ${volume}`)
    }
  }
  const helper = `ma-restore-${Date.now()}`
  docker(['rm', '-f', helper])
  const run = docker(['run', '-d', '--name', helper, '-v', `${volume}:/dst`, 'alpine:3.20', 'sleep', '120'])
  if (run.status !== 0) {
    throw new Error(run.stderr || `Could not mount ${volume}`)
  }
  try {
    const cleared = docker(['exec', helper, 'sh', '-c', 'find /dst -mindepth 1 -maxdepth 1 -exec rm -rf {} +'])
    if (cleared.status !== 0) {
      throw new Error(cleared.stderr || `Could not empty ${volume}`)
    }
    for (const name of readdirSync(hostDir)) {
      const from = join(hostDir, name)
      const target = statSync(from).isDirectory() ? `${helper}:/dst/${name}` : `${helper}:/dst/${name}`
      const copied = docker(['cp', from, target])
      if (copied.status !== 0) {
        throw new Error(copied.stderr || `Could not copy ${name} into ${volume}`)
      }
    }
  } finally {
    docker(['rm', '-f', helper])
  }
}

async function waitForHealth(appEnv: AppEnv, attempts = 40) {
  const port = APP_ENV_HOST_PORTS[appEnv]
  let lastError = new Error(`health check timed out on :${port}`)
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (response.ok) {
        const body = await response.json() as { appEnv?: string, database?: string }
        if (body.appEnv !== appEnv) {
          throw new Error(`expected APP_ENV=${appEnv} on :${port}, got ${body.appEnv}`)
        }
        if (body.database !== 'reachable') {
          throw new Error(`database not reachable on :${port}`)
        }
        return body
      }
      lastError = new Error(`health ${response.status} on :${port}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  throw lastError
}

async function restoreEnvironment(appEnv: AppEnv, zipPath: string, confirmEnv: string) {
  console.info(`[martial-arts] restoring ${zipPath} into ${appEnv}`)
  const staging = join(tmpdir(), `ma-restore-stage-${appEnv}-${Date.now()}`)
  mkdirSync(join(staging, 'sqlite'), { recursive: true })
  mkdirSync(join(staging, 'uploads'), { recursive: true })
  const sqlitePath = join(staging, 'sqlite', 'app.sqlite')
  const uploadsDir = join(staging, 'uploads')
  try {
    const restored = await restoreHostBackup({
      zipPath: resolve(zipPath),
      appEnv,
      confirmEnv,
      sqlitePath,
      uploadsDir,
      databaseUrl: `file:${sqlitePath.replaceAll('\\', '/')}`,
    })
    console.info(`[martial-arts] archive source APP_ENV=${restored.sourceAppEnv}; destination stays ${appEnv}`)
    const config = DOCKER_ENVS[appEnv]
    stopContainer(config.container)
    console.info(`[martial-arts] replacing ${config.sqliteVolume} and ${config.assetVolume} only`)
    copyDirIntoVolume(join(staging, 'sqlite'), config.sqliteVolume)
    copyDirIntoVolume(uploadsDir, config.assetVolume)
    startContainer(config.container)
    const health = await waitForHealth(appEnv)
    console.info(`[martial-arts] restore ok ${appEnv} health appEnv=${health.appEnv}`)
    return restored
  } finally {
    try {
      rmSync(staging, { recursive: true, force: true, maxRetries: 8, retryDelay: 50 })
    } catch (error) {
      console.warn(`[martial-arts] left restore staging ${staging}: ${error instanceof Error ? error.message : error}`)
    }
  }
}

async function pruneProduction(keepPaths?: string[]) {
  const result = pruneHostBackups({ appEnv: 'production', keepPaths })
  console.info(`[martial-arts] PRODUCTION retention ${BACKUP_RETENTION_DAYS} days: kept=${result.kept} removed=${result.removed}`)
  return result
}

async function scheduleProduction(once: boolean) {
  if (once) {
    const record = await backupEnvironment('production')
    await pruneProduction([record.zipPath])
    return record
  }
  const root = hostBackupRoot()
  console.info(`[martial-arts] host PRODUCTION scheduler ${String(BACKUP_SCHEDULE_HOUR).padStart(2, '0')}:${String(BACKUP_SCHEDULE_MINUTE).padStart(2, '0')} ${BACKUP_SCHEDULE_TIMEZONE}`)
  while (true) {
    const next = nextScheduledBackupMs(Date.now())
    recordBackupStatus(root, { nextScheduledAt: next })
    console.info(`[martial-arts] next PRODUCTION backup at ${new Date(next).toISOString()}`)
    await new Promise(resolve => setTimeout(resolve, Math.max(next - Date.now(), 0)))
    try {
      const record = await backupEnvironment('production')
      await pruneProduction([record.zipPath])
    } catch (error) {
      console.error('[martial-arts] scheduled PRODUCTION backup failed')
      console.error(error instanceof Error ? error.message : error)
    }
    await new Promise(resolve => setTimeout(resolve, 60_000))
  }
}

function printStatus() {
  const status = readBackupStatus()
  console.info(`[martial-arts] host backups — same-host only; does not survive disk/laptop loss`)
  console.info(`[martial-arts] PRODUCTION retains ${BACKUP_RETENTION_DAYS} days; STAGE/DEV are manual only`)
  console.info(`[martial-arts] scheduled PRODUCTION backup ${String(BACKUP_SCHEDULE_HOUR).padStart(2, '0')}:${String(BACKUP_SCHEDULE_MINUTE).padStart(2, '0')} ${BACKUP_SCHEDULE_TIMEZONE}`)
  if (status.nextScheduledAt) {
    console.info(`[martial-arts] next scheduled at ${new Date(status.nextScheduledAt).toISOString()}`)
  }
  if (status.lastSuccess) {
    console.info(`[martial-arts] last success ${status.lastSuccess.appEnv} ${status.lastSuccess.operation} ${status.lastSuccess.path || ''} at ${status.lastSuccess.at}`)
  }
  if (status.lastFailure) {
    console.info(`[martial-arts] last failure ${status.lastFailure.appEnv} ${status.lastFailure.operation}: ${status.lastFailure.message}`)
  }
  for (const env of APP_ENVS) {
    const rows = listHostBackups(env)
    console.info(`[martial-arts] ${env}: ${rows.length} backup(s)`)
    for (const row of rows.slice(0, 5)) {
      console.info(`  ${row.zipPath} (${row.bytes} bytes)`)
    }
  }
}

const action = process.argv[2]
const rest = process.argv.slice(3)

if (action === 'status' || action === 'list') {
  printStatus()
} else if (action === 'backup') {
  await backupEnvironment(parseAppEnv(rest[0]))
} else if (action === 'restore') {
  const dest = parseAppEnv(flag('--env', rest))
  const zipPath = flag('--from', rest)
  const confirmEnv = flag('--confirm-env', rest)
  if (!zipPath || !confirmEnv) {
    usage()
  }
  await restoreEnvironment(dest, zipPath, confirmEnv)
} else if (action === 'prune') {
  await pruneProduction()
} else if (action === 'schedule') {
  await scheduleProduction(rest.includes('--once'))
} else {
  usage()
}
