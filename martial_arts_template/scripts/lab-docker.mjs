import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const LABS = {
  'lab-acme-prod': {
    compose: 'docker-compose.lab-acme-prod.yml',
    envLocal: '.env.lab-acme-prod',
    envExample: '.env.lab-acme-prod.example',
    container: 'lab-acme-prod-app',
    marker: 'm10a-prod-isolation',
    port: 52040,
    volumes: ['lab-acme-prod-sqlite', 'lab-acme-prod-assets'],
  },
  'lab-acme-dev': {
    compose: 'docker-compose.lab-acme-dev.yml',
    envLocal: '.env.lab-acme-dev',
    envExample: '.env.lab-acme-dev.example',
    container: 'lab-acme-dev-app',
    marker: 'm10a-dev-isolation',
    port: 52050,
    volumes: ['lab-acme-dev-sqlite', 'lab-acme-dev-assets'],
  },
}

const ACTIONS = ['build', 'up', 'stamp', 'get', 'recreate', 'ps']
const FORBIDDEN = ['-v', '--volumes', 'prune', 'down']

function usage() {
  console.error('Usage: node scripts/lab-docker.mjs <lab-acme-prod|lab-acme-dev> <build|up|stamp|get|recreate|ps>')
  console.error('Lab-only. Refuses -v, prune, down, and any name that is not lab-acme-*.')
}

const extra = process.argv.slice(4).join(' ').toLowerCase()
if (FORBIDDEN.some(token => extra.includes(token) || process.argv.includes(token))) {
  console.error('Refusing a forbidden Docker argument. Never pass -v, prune, or down to this helper.')
  process.exit(1)
}

const slug = process.argv[2]
const action = process.argv[3]
const lab = LABS[slug]

if (!lab || !ACTIONS.includes(action)) {
  usage()
  process.exit(1)
}

if (!/^lab-acme-(prod|dev)$/.test(slug)) {
  console.error(`Refusing slug ${slug}. Only lab-acme-prod and lab-acme-dev are allowed.`)
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = existsSync(join(root, lab.envLocal)) ? lab.envLocal : lab.envExample
if (!existsSync(join(root, envFile))) {
  console.error(`Missing ${lab.envLocal} and ${lab.envExample}`)
  process.exit(1)
}

function compose(args) {
  const result = spawnSync(
    'docker',
    ['compose', '--env-file', envFile, '-f', lab.compose, ...args],
    { cwd: root, stdio: 'inherit', windowsHide: true },
  )
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function exec(args) {
  const result = spawnSync('docker', ['exec', lab.container, ...args], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    if (result.stderr) {
      process.stderr.write(result.stderr)
    }
    process.exit(result.status ?? 1)
  }
  return result.stdout ?? ''
}

if (action === 'build') {
  compose(['build'])
} else if (action === 'up') {
  compose(['up', '-d'])
} else if (action === 'ps') {
  compose(['ps'])
} else if (action === 'recreate') {
  compose(['up', '-d', '--force-recreate', '--no-deps', 'app'])
} else if (action === 'stamp') {
  const remove = ['m10a-dev-isolation.txt', 'm10a-stage-isolation.txt', 'm10a-prod-isolation.txt']
    .map(name => `/app/data/uploads/${name}`)
    .join(' ')
  exec(['sh', '-c', `rm -f ${remove}; printf '%s' '${lab.marker}' > /app/data/uploads/${lab.marker}.txt`])
  exec(['node', 'docker/db-marker.cjs', 'set', lab.marker])
  process.stdout.write(`${JSON.stringify({ slug, container: lab.container, marker: lab.marker })}\n`)
} else if (action === 'get') {
  const dbMarker = exec(['node', 'docker/db-marker.cjs', 'get']).trim()
  const fileMarker = exec(['sh', '-c', `cat /app/data/uploads/${lab.marker}.txt 2>/dev/null || true`]).trim()
  process.stdout.write(`${JSON.stringify({
    slug,
    container: lab.container,
    port: lab.port,
    volumes: lab.volumes,
    dbMarker,
    fileMarker,
  })}\n`)
}
