import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
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

const nuxtBin = join(dirname(fileURLToPath(import.meta.url)), '../node_modules/nuxt/bin/nuxt.mjs')
const child = spawn(process.execPath, [nuxtBin, command, '--port', String(port)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
    NUXT_PORT: String(port),
    NITRO_PORT: String(port),
  },
})

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
