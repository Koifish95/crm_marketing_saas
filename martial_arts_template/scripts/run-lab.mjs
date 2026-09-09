import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const LAB_SLUGS = ['lab-acme-prod', 'lab-acme-dev']
const COMMANDS = ['setup', 'stamp', 'get', 'dev']

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

function usage() {
  console.error('Usage: node scripts/run-lab.mjs <lab-acme-prod|lab-acme-dev> <setup|stamp|get|dev>')
  console.error('Uses .env.<slug> if present, otherwise .env.<slug>.example.')
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

const recipes = {
  setup: [pnpm, ['db:setup'], env],
  stamp: [pnpm, ['exec', 'tsx', 'scripts/lab-isolation.ts', 'stamp'], env],
  get: [pnpm, ['exec', 'tsx', 'scripts/lab-isolation.ts', 'get'], env],
  dev: [process.execPath, [join(root, 'scripts/run-nuxt.mjs'), 'dev'], env],
}

const [bin, args, childEnv] = recipes[command]
const child = spawn(bin, args, {
  cwd: root,
  stdio: 'inherit',
  env: childEnv,
  shell: process.platform === 'win32',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1)
  }
  process.exit(code ?? 1)
})
