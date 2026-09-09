import { spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGE = 'renzo-acquisition:m10a'
const SKIP_TOP = new Set([
  '.git',
  '.nuxt',
  '.output',
  '.nitro',
  '.cache',
  '.data',
  'node_modules',
  'dist',
  'data',
  'vault',
  'tests',
  '.obsidian',
])

const ENVIRONMENTS = {
  dev: {
    envFile: '.env.dev',
    example: '.env.dev.example',
    overlay: 'docker-compose.dev.yml',
    url: 'http://localhost:5020',
  },
  stage: {
    envFile: '.env.stage',
    example: '.env.stage.example',
    overlay: 'docker-compose.stage.yml',
    url: 'http://localhost:5010',
  },
  prod: {
    envFile: '.env.production',
    example: '.env.production.example',
    overlay: 'docker-compose.prod.yml',
    url: 'http://localhost:5000',
  },
}

const ACTIONS = ['up', 'down', 'restart', 'build', 'logs', 'ps', 'reset', 'pull', 'load-local']
const ALL_FILE = 'docker-compose.all.yml'
const PULL_CONFIRM = '--confirm-pull-from-prod'
const LOAD_LOCAL_CONFIRM = '--confirm-load-local-into-prod'
const PROD_CONTAINER = 'renzo-prod-app-1'
const PROD_ISOLATION_MARKER = 'm10a-prod-isolation'
const PULL_APPS = [
  { name: 'prod', container: 'renzo-prod-app-1', port: 5000, appEnv: 'production' },
  { name: 'stage', container: 'renzo-stage-app-1', port: 5010, appEnv: 'stage', marker: 'm10a-stage-isolation' },
  { name: 'dev', container: 'renzo-dev-app-1', port: 5020, appEnv: 'dev', marker: 'm10a-dev-isolation' },
]
const ISOLATION_MARKER_FILES = [
  'm10a-dev-isolation.txt',
  'm10a-stage-isolation.txt',
  'm10a-prod-isolation.txt',
]

function usage(exitCode = 1) {
  console.error(`Usage: node scripts/env.mjs <dev|stage|prod|all> <${ACTIONS.join('|')}>`)
  console.error('DEV reset requires --confirm-dev-reset and deletes the DEV volumes only.')
  console.error('Pull requires --confirm-pull-from-prod and overwrites STAGE and DEV from PRODUCTION.')
  console.error('Load-local requires --confirm-load-local-into-prod and overwrites PRODUCTION from data/renzo.sqlite.')
  process.exit(exitCode)
}

const envName = process.argv[2]
const action = process.argv[3]
const extra = process.argv.slice(4)
const isAll = envName === 'all'
const config = ENVIRONMENTS[envName]

if ((!config && !isAll) || !ACTIONS.includes(action)) {
  usage()
}

if (action === 'reset' && envName !== 'dev') {
  console.error('Refusing to reset non-DEV volumes. There is no prod/stage reset command.')
  process.exit(1)
}

if (action === 'reset' && !extra.includes('--confirm-dev-reset')) {
  console.error('Destructive DEV reset. This deletes the renzo-dev SQLite and asset volumes.')
  console.error('Re-run: pnpm env:dev:reset -- --confirm-dev-reset')
  process.exit(1)
}

if (action === 'pull' && !isAll) {
  console.error('Pull copies PRODUCTION onto STAGE and DEV. Use: pnpm env:pull -- --confirm-pull-from-prod')
  process.exit(1)
}

if (action === 'pull' && !extra.includes(PULL_CONFIRM)) {
  console.error('This overwrites STAGE and DEV SQLite and marketing uploads with PRODUCTION data.')
  console.error('Sign-in on STAGE and DEV then uses PRODUCTION users and passwords.')
  console.error(`Re-run: pnpm env:pull -- ${PULL_CONFIRM}`)
  process.exit(1)
}

if (action === 'load-local' && envName !== 'prod') {
  console.error('Load-local overwrites Docker PRODUCTION only. Use: pnpm env:prod:load-local -- --confirm-load-local-into-prod')
  process.exit(1)
}

if (action === 'load-local' && !extra.includes(LOAD_LOCAL_CONFIRM)) {
  console.error('This overwrites Docker PRODUCTION SQLite and marketing uploads with local pnpm dev data.')
  console.error('Stop pnpm dev first if it is running, so SQLite WAL is flushed.')
  console.error(`Re-run: pnpm env:prod:load-local -- ${LOAD_LOCAL_CONFIRM}`)
  process.exit(1)
}

function ensureEnvFile(env) {
  const envPath = resolve(root, env.envFile)
  if (!existsSync(envPath)) {
    copyFileSync(resolve(root, env.example), envPath)
    console.info(`[renzo] created ${env.envFile} from ${env.example}. Edit secrets before a real deployment.`)
  }
}

if (isAll) {
  for (const env of Object.values(ENVIRONMENTS)) {
    ensureEnvFile(env)
  }
} else {
  ensureEnvFile(config)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    // Windows cmd/PowerShell steal `>` and `2>` from container `sh -c` if shell is true.
    shell: false,
    windowsHide: true,
    env: { ...process.env, COMPOSE_BAKE: 'false', ...options.env },
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
  return result
}

function composeSplit(env, args) {
  return spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      env.envFile,
      '-f',
      'docker-compose.yml',
      '-f',
      env.overlay,
      ...args,
    ],
    {
      cwd: root,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
      env: { ...process.env, COMPOSE_BAKE: 'false' },
    },
  )
}

function compose(args) {
  run('docker', [
    'compose',
    '--env-file',
    config.envFile,
    '-f',
    'docker-compose.yml',
    '-f',
    config.overlay,
    ...args,
  ])
}

function composeAll(args) {
  run('docker', ['compose', '-f', ALL_FILE, ...args])
}

function downSplitStacks() {
  for (const env of Object.values(ENVIRONMENTS)) {
    composeSplit(env, ['down'])
  }
}

function downAllStack() {
  spawnSync('docker', ['compose', '-f', ALL_FILE, 'down'], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
    env: { ...process.env, COMPOSE_BAKE: 'false' },
  })
}

function printAllUrls() {
  console.info('[renzo] PRODUCTION → http://localhost:5000')
  console.info('[renzo] STAGE → http://localhost:5010')
  console.info('[renzo] DEV → http://localhost:5020')
  console.info('[renzo] local pnpm dev stays on http://localhost:5030')
}

function stageDockerContext() {
  const dest = join(tmpdir(), 'renzo-acquisition-docker-context')
  console.info(`[renzo] staging Docker context at ${dest}`)
  console.info('[renzo] Docker Desktop cannot read OneDrive cloud files from Desktop; copying a local context')
  rmSync(dest, { recursive: true, force: true })
  cpSync(root, dest, {
    recursive: true,
    filter: (src) => {
      const rel = relative(root, src)
      if (!rel) {
        return true
      }
      const [top] = rel.split(/[\\/]/)
      if (SKIP_TOP.has(top)) {
        return false
      }
      if (top.startsWith('.env') && top !== '.env.example') {
        return false
      }
      return true
    },
  })
  return dest
}

function imageExists() {
  const result = spawnSync('docker', ['image', 'inspect', IMAGE], {
    cwd: root,
    stdio: 'pipe',
    shell: false,
    windowsHide: true,
  })
  return result.status === 0
}

function dockerBuild() {
  const context = process.platform === 'win32' ? stageDockerContext() : root
  console.info(`[renzo] building ${IMAGE}`)
  run('docker', ['build', '-t', IMAGE, context])
}

function prepareImage() {
  const skipBuild = extra.includes('--no-build')
  if (skipBuild) {
    if (!imageExists()) {
      console.error(`[renzo] ${IMAGE} is missing. Run without --no-build, or pnpm env:build.`)
      process.exit(1)
    }
    return true
  }
  if (process.platform === 'win32') {
    dockerBuild()
    return true
  }
  return false
}

function volumeExists(name) {
  const result = spawnSync('docker', ['volume', 'inspect', name], {
    cwd: root,
    stdio: 'pipe',
    shell: false,
    windowsHide: true,
  })
  return result.status === 0
}

function ensureVolume(name) {
  if (volumeExists(name)) {
    return
  }
  console.info(`[renzo] creating volume ${name}`)
  run('docker', ['volume', 'create', name])
}

function containerExists(name) {
  const result = spawnSync('docker', ['inspect', name], {
    cwd: root,
    stdio: 'pipe',
    shell: false,
    windowsHide: true,
  })
  return result.status === 0
}

function stopIfPresent(name) {
  if (!containerExists(name)) {
    console.info(`[renzo] ${name} is not present`)
    return
  }
  console.info(`[renzo] stopping ${name}`)
  spawnSync('docker', ['stop', name], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  })
}

function copyVolume(src, dst, { allowEmpty = false } = {}) {
  console.info(`[renzo] copying ${src} → ${dst}`)
  const check = allowEmpty
    ? 'true'
    : 'if [ -z "$(ls -A /src 2>/dev/null)" ]; then echo "source volume is empty" >&2; exit 1; fi'
  run('docker', [
    'run',
    '--rm',
    '-v',
    `${src}:/src`,
    '-v',
    `${dst}:/dst`,
    'alpine:3.20',
    'sh',
    '-c',
    `set -e; ${check}; find /dst -mindepth 1 -maxdepth 1 -exec rm -rf {} +; cp -a /src/. /dst/`,
  ])
}

function restampIsolation(container, marker) {
  const remove = ISOLATION_MARKER_FILES.map(name => `/app/data/uploads/${name}`).join(' ')
  run('docker', [
    'exec',
    container,
    'sh',
    '-c',
    `rm -f ${remove}; printf '%s' '${marker}' > /app/data/uploads/${marker}.txt`,
  ])
  run('docker', ['exec', container, 'node', 'docker/db-marker.cjs', 'set', marker])
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForHealth(port, appEnv, attempts = 40) {
  let lastError = new Error(`health check timed out on :${port}`)
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (response.ok) {
        const body = await response.json()
        if (body.appEnv !== appEnv) {
          throw new Error(`expected APP_ENV=${appEnv} on :${port}, got ${body.appEnv}`)
        }
        if (body.database !== 'reachable') {
          throw new Error(`database not reachable on :${port}`)
        }
        return
      }
      lastError = new Error(`health ${response.status} on :${port}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
    await sleep(3000)
  }
  throw lastError
}

async function pullFromProduction() {
  const sqliteSrc = 'renzo-prod-sqlite'
  const assetSrc = 'renzo-prod-assets'
  if (!volumeExists(sqliteSrc)) {
    console.error(`[renzo] missing ${sqliteSrc}. Start PRODUCTION first (pnpm env:up or pnpm env:prod:up).`)
    process.exit(1)
  }
  if (!volumeExists(assetSrc)) {
    console.error(`[renzo] missing ${assetSrc}. Start PRODUCTION first (pnpm env:up or pnpm env:prod:up).`)
    process.exit(1)
  }
  ensureVolume('renzo-stage-sqlite')
  ensureVolume('renzo-dev-sqlite')
  ensureVolume('renzo-stage-assets')
  ensureVolume('renzo-dev-assets')

  console.warn('[renzo] stopping PRODUCTION, STAGE, and DEV so SQLite can be copied cleanly')
  for (const app of PULL_APPS) {
    stopIfPresent(app.container)
  }

  copyVolume(sqliteSrc, 'renzo-stage-sqlite')
  copyVolume(sqliteSrc, 'renzo-dev-sqlite')
  copyVolume(assetSrc, 'renzo-stage-assets', { allowEmpty: true })
  copyVolume(assetSrc, 'renzo-dev-assets', { allowEmpty: true })

  const missing = PULL_APPS.filter(app => !containerExists(app.container))
  if (missing.length > 0) {
    console.info('[renzo] starting the combined stack so pulled volumes attach to app containers')
    const imageReady = prepareImage()
    composeAll(imageReady ? ['up', '-d', '--no-build'] : ['up', '-d', '--build'])
  } else {
    for (const app of PULL_APPS) {
      console.info(`[renzo] starting ${app.container}`)
      run('docker', ['start', app.container])
    }
  }

  for (const app of PULL_APPS) {
    console.info(`[renzo] waiting for ${app.name} health on :${app.port}`)
    await waitForHealth(app.port, app.appEnv)
  }

  for (const app of PULL_APPS) {
    if (!app.marker) {
      continue
    }
    console.info(`[renzo] restamping ${app.name} isolation marker`)
    restampIsolation(app.container, app.marker)
  }

  console.info('[renzo] STAGE and DEV now have PRODUCTION SQLite and marketing uploads.')
  console.info('[renzo] Sign in on STAGE and DEV with PRODUCTION users and passwords.')
  printAllUrls()
}

function stageLocalData() {
  const sqlite = resolve(root, 'data', 'renzo.sqlite')
  if (!existsSync(sqlite)) {
    console.error('[renzo] missing data/renzo.sqlite. Local pnpm dev data is required.')
    process.exit(1)
  }
  const dest = join(tmpdir(), 'renzo-load-local')
  rmSync(dest, { recursive: true, force: true })
  const sqliteDir = join(dest, 'sqlite')
  const uploadsDir = join(dest, 'uploads')
  mkdirSync(sqliteDir, { recursive: true })
  mkdirSync(uploadsDir, { recursive: true })
  copyFileSync(sqlite, join(sqliteDir, 'renzo.sqlite'))
  for (const extraName of ['renzo.sqlite-wal', 'renzo.sqlite-shm']) {
    const extraPath = resolve(root, 'data', extraName)
    if (existsSync(extraPath)) {
      copyFileSync(extraPath, join(sqliteDir, extraName))
    }
  }
  const uploads = resolve(root, 'data', 'uploads')
  if (existsSync(uploads)) {
    cpSync(uploads, uploadsDir, { recursive: true })
  }
  return { dest, sqliteDir, uploadsDir }
}

function copyHostDirIntoVolume(hostDir, volume) {
  const helper = 'renzo-load-helper'
  spawnSync('docker', ['rm', '-f', helper], {
    cwd: root,
    stdio: 'pipe',
    shell: false,
    windowsHide: true,
  })
  run('docker', ['run', '-d', '--name', helper, '-v', `${volume}:/dst`, 'alpine:3.20', 'sleep', '120'])
  try {
    run('docker', ['exec', helper, 'sh', '-c', 'find /dst -mindepth 1 -maxdepth 1 -exec rm -rf {} +'])
    run('docker', ['cp', `${join(hostDir, '.')}`, `${helper}:/dst/`])
  } finally {
    spawnSync('docker', ['rm', '-f', helper], {
      cwd: root,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    })
  }
}

async function loadLocalIntoProduction() {
  console.warn('[renzo] Stop pnpm dev first if it is running, so SQLite WAL is flushed.')
  const staged = stageLocalData()
  try {
    ensureVolume('renzo-prod-sqlite')
    ensureVolume('renzo-prod-assets')
    stopIfPresent(PROD_CONTAINER)
    console.info('[renzo] copying local SQLite into renzo-prod-sqlite')
    copyHostDirIntoVolume(staged.sqliteDir, 'renzo-prod-sqlite')
    console.info('[renzo] copying local uploads into renzo-prod-assets')
    copyHostDirIntoVolume(staged.uploadsDir, 'renzo-prod-assets')
    if (!containerExists(PROD_CONTAINER)) {
      console.info('[renzo] starting PRODUCTION container')
      const imageReady = prepareImage()
      composeAll(imageReady ? ['up', '-d', '--no-build', 'prod'] : ['up', '-d', '--build', 'prod'])
    } else {
      console.info(`[renzo] starting ${PROD_CONTAINER}`)
      run('docker', ['start', PROD_CONTAINER])
    }
    console.info('[renzo] waiting for PRODUCTION health on :5000')
    await waitForHealth(5000, 'production')
    console.info('[renzo] restamping PRODUCTION isolation marker')
    restampIsolation(PROD_CONTAINER, PROD_ISOLATION_MARKER)
    console.info('[renzo] PRODUCTION now has local pnpm dev SQLite and uploads.')
    console.info('[renzo] Sign in at http://localhost:5000 with those local users and passwords.')
  } finally {
    rmSync(staged.dest, { recursive: true, force: true })
  }
}

if (isAll) {
  if (action === 'up') {
    const imageReady = prepareImage()
    console.info('[renzo] stopping per-environment Compose projects so ports 5000/5010/5020 are free')
    downSplitStacks()
    composeAll(imageReady ? ['up', '-d', '--no-build', '--force-recreate'] : ['up', '-d', '--build', '--force-recreate'])
    printAllUrls()
  } else if (action === 'down') {
    composeAll(['down'])
    downSplitStacks()
  } else if (action === 'restart') {
    composeAll(['restart'])
  } else if (action === 'build') {
    if (process.platform === 'win32') {
      dockerBuild()
    } else {
      composeAll(['build'])
    }
  } else if (action === 'logs') {
    composeAll(['logs', '-f', '--tail', '200'])
  } else if (action === 'ps') {
    composeAll(['ps'])
  } else if (action === 'pull') {
    await pullFromProduction()
  }
} else if (action === 'up') {
  const imageReady = prepareImage()
  downAllStack()
  compose(imageReady
    ? ['up', '-d', '--no-build', '--force-recreate']
    : ['up', '-d', '--build'])
  console.info(`[renzo] ${envName} → ${config.url}`)
} else if (action === 'down') {
  compose(['down'])
} else if (action === 'restart') {
  compose(['restart'])
} else if (action === 'build') {
  if (process.platform === 'win32') {
    dockerBuild()
  } else {
    compose(['build'])
  }
} else if (action === 'logs') {
  compose(['logs', '-f', '--tail', '200'])
} else if (action === 'ps') {
  compose(['ps'])
} else if (action === 'reset') {
  console.warn('[renzo] DESTROYING DEV volumes (renzo-dev-sqlite, renzo-dev-assets)')
  compose(['down', '-v', '--remove-orphans'])
} else if (action === 'load-local') {
  await loadLocalIntoProduction()
}
