import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { assertSafeVolumeName, findSqliteFilename } from '../../shared/utils/fleet-backup'
import { inspectRegisteredContainer } from './docker-runtime'

const FORBIDDEN = ['-v', '--volumes', 'prune', 'down']
const SQLITE_CANDIDATES = ['/app/data/sqlite/crm.sqlite', '/app/data/sqlite/app.sqlite']

function docker(args: string[]) {
  if (args.some(part => FORBIDDEN.some(token => part === token || part.includes(token)))) {
    throw new Error('Refusing a forbidden Docker argument.')
  }
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Docker command failed.')
  }
  return result
}

function copyUploadsFromContainer(containerName: string, dest: string) {
  mkdirSync(join(dest, 'uploads'), { recursive: true })
  try {
    docker(['cp', `${containerName}:/app/data/uploads/.`, join(dest, 'uploads')])
  } catch {
    mkdirSync(join(dest, 'uploads'), { recursive: true })
  }
}

function snapshotFromRunningContainer(containerName: string, dest: string) {
  const sqliteDir = join(dest, 'sqlite')
  mkdirSync(sqliteDir, { recursive: true })
  const snapshotInContainer = '/tmp/ma-sqlite-snapshot.sqlite'
  let lastError: Error | undefined
  for (const src of SQLITE_CANDIDATES) {
    try {
      docker(['exec', containerName, 'node', 'docker/sqlite-snapshot.cjs', src, snapshotInContainer])
      const filename = src.split('/').pop() || 'crm.sqlite'
      docker(['cp', `${containerName}:${snapshotInContainer}`, join(sqliteDir, filename)])
      spawnSync('docker', ['exec', containerName, 'rm', '-f', snapshotInContainer], {
        encoding: 'utf8',
        windowsHide: true,
      })
      copyUploadsFromContainer(containerName, dest)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('SQLite-safe snapshot failed.')
    }
  }
  throw new Error(lastError?.message || 'SQLite-safe snapshot failed. Rebuild the customer image so docker/sqlite-snapshot.cjs is present.')
}

function copyFromVolume(volume: string, dest: string) {
  assertSafeVolumeName(volume)
  mkdirSync(dest, { recursive: true })
  const helper = `fleet-backup-copy-${Date.now()}`
  spawnSync('docker', ['rm', '-f', helper], { encoding: 'utf8', windowsHide: true })
  const run = spawnSync('docker', ['run', '-d', '--name', helper, '-v', `${volume}:/src`, 'alpine:3.20', 'sleep', '60'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (run.status !== 0) {
    throw new Error(run.stderr?.trim() || run.stdout?.trim() || 'Volume copy helper failed.')
  }
  try {
    docker(['cp', `${helper}:/src/.`, dest])
  } finally {
    spawnSync('docker', ['rm', '-f', helper], { encoding: 'utf8', windowsHide: true })
  }
}

function copyIntoVolume(volume: string, source: string) {
  assertSafeVolumeName(volume)
  const helper = `fleet-backup-restore-${Date.now()}`
  spawnSync('docker', ['rm', '-f', helper], { encoding: 'utf8', windowsHide: true })
  const run = spawnSync('docker', ['run', '-d', '--name', helper, '-v', `${volume}:/dest`, 'alpine:3.20', 'sleep', '60'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (run.status !== 0) {
    throw new Error(run.stderr?.trim() || run.stdout?.trim() || 'Volume restore helper failed.')
  }
  try {
    docker(['cp', `${source}/.`, `${helper}:/dest`])
  } finally {
    spawnSync('docker', ['rm', '-f', helper], { encoding: 'utf8', windowsHide: true })
  }
}

export function snapshotRegisteredEnvironment(input: {
  containerName: string
  sqliteVolume: string
  assetsVolume: string
  registeredNames: readonly string[]
}) {
  const dest = join(tmpdir(), `fleet-backup-${randomUUID()}`)
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  const runtime = inspectRegisteredContainer(input.containerName, input.registeredNames)
  if (runtime === 'running') {
    snapshotFromRunningContainer(input.containerName, dest)
  } else {
    copyFromVolume(input.sqliteVolume, join(dest, 'sqlite'))
    try {
      copyFromVolume(input.assetsVolume, join(dest, 'uploads'))
    } catch {
      mkdirSync(join(dest, 'uploads'), { recursive: true })
    }
  }
  const sqliteDir = join(dest, 'sqlite')
  const sqliteFilename = findSqliteFilename(existsSync(sqliteDir) ? readdirSync(sqliteDir) : [])
  return {
    dest,
    sqliteDir,
    sqlitePath: join(sqliteDir, sqliteFilename),
    sqliteFilename,
    uploadsDir: join(dest, 'uploads'),
  }
}

export function restoreSnapshotToEnvironment(input: {
  containerName: string
  sqliteVolume: string
  assetsVolume: string
  sqliteDir: string
  uploadsDir: string
  registeredNames: readonly string[]
}) {
  const runtime = inspectRegisteredContainer(input.containerName, input.registeredNames)
  if (runtime === 'running') {
    docker(['cp', `${input.sqliteDir}/.`, `${input.containerName}:/app/data/sqlite`])
    if (existsSync(input.uploadsDir)) {
      docker(['cp', `${input.uploadsDir}/.`, `${input.containerName}:/app/data/uploads`])
    }
    return
  }
  copyIntoVolume(input.sqliteVolume, input.sqliteDir)
  if (existsSync(input.uploadsDir)) {
    copyIntoVolume(input.assetsVolume, input.uploadsDir)
  }
}
