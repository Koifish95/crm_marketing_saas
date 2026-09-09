import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const LAB_SLUGS = ['lab-acme-prod', 'lab-acme-dev']
const COMMANDS = ['setup', 'stamp', 'get', 'dev', 'serve']
const FORBIDDEN_PORTS = [3000, 5000, 5010, 5020]

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {}
  }
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const separator = trimmed.indexOf('=')
    if (separator <= 0) {
      continue
    }
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function labPort(env) {
  const raw = Number.parseInt(env.NUXT_PORT || env.PORT || '', 10)
  if (!Number.isInteger(raw) || raw <= 0) {
    throw new Error('Lab env must set NUXT_PORT or PORT.')
  }
  if (FORBIDDEN_PORTS.includes(raw)) {
    throw new Error(`Refusing reserved port ${raw}.`)
  }
  return raw
}

function usage() {
  console.error('Usage: node scripts/run-lab.mjs <lab-acme-prod|lab-acme-dev> <setup|stamp|get|dev|serve>')
  console.error('Uses .env.<slug> if present, otherwise .env.<slug>.example.')
  console.error('serve runs the built Nitro server (pnpm build first). Prefer that for two concurrent labs.')
  console.error('Do not point these roots at webhosting_renzo_* or renzo-prod-*.')
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const slug = process.argv[2]
const command = process.argv[3]

if (!LAB_SLUGS.includes(slug) || !COMMANDS.includes(command)) {
  usage()
  process.exit(1)
}

const localEnv = join(root, `.env.${slug}`)
const exampleEnv = join(root, `.env.${slug}.example`)
const envPath = existsSync(localEnv) ? localEnv : exampleEnv
if (!existsSync(envPath)) {
  console.error(`Missing ${localEnv} and ${exampleEnv}`)
  process.exit(1)
}

const fileEnv = loadEnvFile(envPath)
const env = { ...process.env, ...fileEnv }
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const nuxtBin = join(root, 'node_modules/nuxt/bin/nuxt.mjs')
const nitroServer = join(root, '.output/server/index.mjs')

let bin
let args
let childEnv = env

try {
  if (command === 'setup') {
    bin = pnpm
    args = ['db:setup']
  } else if (command === 'stamp') {
    bin = pnpm
    args = ['exec', 'tsx', 'scripts/lab-isolation.ts', 'stamp']
  } else if (command === 'get') {
    bin = pnpm
    args = ['exec', 'tsx', 'scripts/lab-isolation.ts', 'get']
  } else if (command === 'dev') {
    const port = labPort(env)
    bin = process.execPath
    args = [nuxtBin, 'dev', '--port', String(port)]
    childEnv = {
      ...env,
      PORT: String(port),
      NUXT_PORT: String(port),
      NITRO_PORT: String(port),
    }
  } else {
    if (!existsSync(nitroServer)) {
      console.error('Missing .output/server/index.mjs. Run pnpm build first, then pnpm lab <slug> serve.')
      process.exit(1)
    }
    const port = labPort(env)
    bin = process.execPath
    args = [nitroServer]
    childEnv = {
      ...env,
      HOST: env.HOST || '127.0.0.1',
      PORT: String(port),
      NUXT_PORT: String(port),
      NITRO_PORT: String(port),
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

const child = spawn(bin, args, {
  cwd: root,
  stdio: 'inherit',
  env: childEnv,
  shell: process.platform === 'win32' && bin === pnpm,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1)
  }
  process.exit(code ?? 1)
})
