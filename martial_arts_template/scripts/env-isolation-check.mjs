import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ENVS = [
  { name: 'dev', port: 5020, project: 'martial-arts-dev', appEnv: 'dev', marker: 'm10a-dev-isolation' },
  { name: 'stage', port: 5010, project: 'martial-arts-stage', appEnv: 'stage', marker: 'm10a-stage-isolation' },
  { name: 'prod', port: 5000, project: 'martial-arts-prod', appEnv: 'production', marker: 'm10a-prod-isolation' },
]

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
    // Windows cmd/PowerShell steal `>` from docker exec sh -c if shell is true.
    shell: false,
    windowsHide: true,
  })
  if (result.status !== 0) {
    const output = `${result.stdout || ''}${result.stderr || ''}`
    throw new Error(`${command} ${args.join(' ')}\n${output}`)
  }
  return result.stdout || ''
}

function compose(envName, args) {
  return spawnSync(process.execPath, ['scripts/env.mjs', envName, ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  })
}

function containerName(project) {
  return `${project}-app-1`
}

async function waitForHealth(port, appEnv, attempts = 40) {
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
        return body
      }
    } catch (error) {
      if (i === attempts - 1) {
        throw error
      }
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 3000))
  }
  throw new Error(`health check timed out on :${port}`)
}

function writeMarker(project, marker) {
  const container = containerName(project)
  run('docker', ['exec', container, 'sh', '-c', `printf '%s' '${marker}' > /app/data/uploads/${marker}.txt`])
  run('docker', ['exec', container, 'node', 'docker/db-marker.cjs', 'set', marker])
}

function readMarker(project) {
  const container = containerName(project)
  const files = run('docker', ['exec', container, 'sh', '-c', 'ls /app/data/uploads'])
  const dbValue = run('docker', ['exec', container, 'node', 'docker/db-marker.cjs', 'get']).trim()
  return { files, dbValue }
}

function assertIsolation() {
  for (const env of ENVS) {
    const { files, dbValue } = readMarker(env.project)
    if (dbValue !== env.marker) {
      throw new Error(`${env.name} database marker expected ${env.marker}, got ${dbValue}`)
    }
    if (!files.includes(`${env.marker}.txt`)) {
      throw new Error(`${env.name} missing its own asset marker`)
    }
    for (const other of ENVS.filter(item => item.name !== env.name)) {
      if (files.includes(`${other.marker}.txt`)) {
        throw new Error(`${env.name} asset storage contains ${other.name} marker`)
      }
      if (dbValue === other.marker) {
        throw new Error(`${env.name} database contains ${other.name} marker`)
      }
    }
  }
}

async function persistenceCheck() {
  const env = ENVS[0]
  const container = containerName(env.project)
  console.info('[martial-arts] persistence: restart DEV container')
  run('docker', ['restart', container])
  await waitForHealth(env.port, env.appEnv)
  assertIsolation()

  console.info('[martial-arts] persistence: recreate DEV container without -v')
  const down = compose('dev', ['down'])
  if (down.status !== 0) {
    throw new Error('dev down failed')
  }
  const up = compose('dev', ['up'])
  if (up.status !== 0) {
    throw new Error('dev up failed')
  }
  await waitForHealth(env.port, env.appEnv)
  assertIsolation()
}

function dockerAvailable() {
  const result = spawnSync('docker', ['info'], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  })
  return result.status === 0
}

async function main() {
  if (!dockerAvailable()) {
    console.error('[martial-arts] Docker engine is not reachable. Start Docker Desktop with Linux containers, then retry.')
    process.exit(2)
  }

  for (const env of ENVS) {
    console.info(`[martial-arts] starting ${env.name}`)
    const result = compose(env.name, ['up'])
    if (result.status !== 0) {
      throw new Error(`failed to start ${env.name}`)
    }
  }

  for (const env of ENVS) {
    console.info(`[martial-arts] waiting for ${env.name} health`)
    await waitForHealth(env.port, env.appEnv)
    writeMarker(env.project, env.marker)
  }

  assertIsolation()
  await persistenceCheck()
  console.info('[martial-arts] isolation and persistence checks passed')
}

main().catch((error) => {
  console.error('[martial-arts] isolation check failed')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
