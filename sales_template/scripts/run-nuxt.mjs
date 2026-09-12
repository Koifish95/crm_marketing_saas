import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import process from 'node:process'
import { chooseListenPort, isForbiddenPort } from './listen-port.mjs'

const command = process.argv[2]
if (command !== 'dev' && command !== 'preview') {
  console.error('Usage: node scripts/run-nuxt.mjs <dev|preview>')
  process.exit(1)
}

let port
try {
  port = await chooseListenPort()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

if (isForbiddenPort(port)) {
  console.error(`Refusing to listen on reserved port ${port}.`)
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(here, '..')
loadDotEnv(join(packageRoot, '.env'))
const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL || 'file:./data/app.sqlite', packageRoot)

const nuxtBin = [
  join(here, '../node_modules/nuxt/bin/nuxt.mjs'),
  join(here, '../../node_modules/nuxt/bin/nuxt.mjs'),
].find(existsSync)
if (!nuxtBin) {
  console.error('Could not find nuxt/bin/nuxt.mjs in this package or the workspace root.')
  process.exit(1)
}
const child = spawn(process.execPath, [nuxtBin, command, '--port', String(port)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
    NUXT_PORT: String(port),
    NITRO_PORT: String(port),
    DATABASE_URL: databaseUrl,
  },
})

function loadDotEnv(envPath) {
  if (!existsSync(envPath)) {
    return
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function resolveDatabaseUrl(url, root) {
  if (!url.startsWith('file:')) {
    return url
  }

  const filePath = url.slice('file:'.length)
  if (filePath.startsWith('//') || isAbsolute(filePath)) {
    return url
  }

  return `file:${resolve(root, filePath).replaceAll('\\', '/')}`
}

function shutDown() {
  if (!child.killed) {
    child.kill()
  }
}

process.on('SIGINT', shutDown)
process.on('SIGTERM', shutDown)
child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1)
  }
  process.exit(code ?? 1)
})
