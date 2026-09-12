import { execFile } from 'node:child_process'
import { readFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const PREFERRED_PORT = 5040
export const FALLBACK_PORTS = [5041, 5042, 5043, 5044, 5045]
export const FORBIDDEN_PORT = 3000
export const FORBIDDEN_PORTS = [3000, 5000, 5010, 5020, 5030]

export function isForbiddenPort(port) {
  return FORBIDDEN_PORTS.includes(Number(port))
}

export function parseListeningPids(netstatOutput, port) {
  const pids = new Set()
  const portToken = `:${port}`
  for (const rawLine of String(netstatOutput).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.toUpperCase().includes('LISTENING')) {
      continue
    }
    const local = line.split(/\s+/)[1] || ''
    if (!local.endsWith(portToken) && !local.includes(`${portToken}]`)) {
      continue
    }
    const pid = Number(line.split(/\s+/).at(-1))
    if (Number.isInteger(pid) && pid > 4) {
      pids.add(pid)
    }
  }
  return [...pids]
}

export function readNuxtLockPid(lockJson) {
  try {
    const info = JSON.parse(String(lockJson))
    const pid = Number(info?.pid)
    return Number.isInteger(pid) && pid > 4 ? pid : null
  } catch {
    return null
  }
}

export async function pidsOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('netstat', ['-ano'])
      return parseListeningPids(stdout, port)
    } catch {
      return []
    }
  }
  try {
    const { stdout } = await execFileAsync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'])
    return stdout
      .split(/\s+/)
      .map(Number)
      .filter(pid => Number.isInteger(pid) && pid > 4)
  } catch {
    return []
  }
}

function tryListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once('error', (error) => {
      resolve(error && 'code' in error && error.code === 'EADDRINUSE' ? false : true)
    })
    server.listen({ port, host, exclusive: true, ipv6Only: host === '::1' }, () => {
      server.close(() => resolve(true))
    })
  })
}

export async function isPortAvailable(port) {
  if (isForbiddenPort(port)) {
    return false
  }
  const ipv4 = await tryListen(port, '127.0.0.1')
  const ipv6 = await tryListen(port, '::1')
  return ipv4 && ipv6
}

async function killPid(pid) {
  if (pid === process.pid || pid === process.ppid) {
    return
  }
  if (process.platform === 'win32') {
    await execFileAsync('taskkill', ['/PID', String(pid), '/T', '/F']).catch(() => undefined)
    return
  }
  await execFileAsync('kill', ['-9', String(pid)]).catch(() => undefined)
}

function nuxtLockPath() {
  return join(dirname(fileURLToPath(import.meta.url)), '../.nuxt/nuxt.lock')
}

async function stopExistingNuxtLock() {
  const lockPath = nuxtLockPath()
  try {
    const pid = readNuxtLockPid(readFileSync(lockPath, 'utf8'))
    if (pid) {
      console.log(`Stopping existing Nuxt dev lock PID ${pid}.`)
      await killPid(pid)
    }
  } catch {
    return
  }
  try {
    unlinkSync(lockPath)
  } catch {
    // Lock file may already be gone after the process exits.
  }
}

async function waitFor(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export async function freePreferredPort() {
  await stopExistingNuxtLock()
  const pids = await pidsOnPort(PREFERRED_PORT)
  for (const pid of pids) {
    console.log(`Port ${PREFERRED_PORT} is in use by PID ${pid}. Stopping that process.`)
    await killPid(pid)
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await isPortAvailable(PREFERRED_PORT)) {
      return true
    }
    await waitFor(150)
  }
  return isPortAvailable(PREFERRED_PORT)
}

export async function chooseListenPort() {
  const preferredFree = await freePreferredPort()
  if (preferredFree) {
    return PREFERRED_PORT
  }
  console.warn(`Port ${PREFERRED_PORT} could not be bound after stopping listeners. Trying ${FALLBACK_PORTS.join(', ')}.`)
  for (const port of FALLBACK_PORTS) {
    if (isForbiddenPort(port)) {
      continue
    }
    if (await isPortAvailable(port)) {
      console.warn(`Using fallback port ${port}. Preferred URL remains http://localhost:${PREFERRED_PORT}/ when that port is free.`)
      return port
    }
  }
  throw new Error(
    `Could not bind http://localhost:${PREFERRED_PORT}/ or fallbacks ${FALLBACK_PORTS.join(', ')}. Ports ${FORBIDDEN_PORTS.join(', ')} are never used.`,
  )
}
