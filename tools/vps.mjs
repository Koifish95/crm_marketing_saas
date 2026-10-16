#!/usr/bin/env node
// Nuxxion VPS helper: test SSH, check, start, stop, restart, tunnel, and deploy
// the Control Plane (systemd `sic-control-plane`). No dependencies; uses the
// system `ssh` and `git`. It never runs Docker and never touches customer environments.
//
//   pnpm vps                 menu
//   pnpm vps <command>       test | status | start | stop | restart | tunnel | deploy
//   pnpm vps deploy [ref]    deploy a pushed commit (default origin/working)
//   --yes                    skip the confirmation on stop / restart / deploy

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

export const SERVICE = 'sic-control-plane'
export const REMOTE_PORT = 52100
export const COMMANDS = ['test', 'status', 'start', 'stop', 'restart', 'tunnel', 'deploy']
export const BRANCH = 'working'
export const REMOTE_ROOT = '/opt/sic/crm_marketing_saas'
// Customer environments publish on loopback in this range (the Control Plane allocates from 52200).
export const ENV_PORT_MIN = 52200
export const ENV_PORT_MAX = 52299

const here = dirname(fileURLToPath(import.meta.url))
const REPO = join(here, '..')
const DEPLOY_SCRIPT = join(REPO, 'deploy', 'hosting-node', 'deploy-control-plane.sh')
const CONFIG_PATH = join(here, 'vps.config.json')
const EXAMPLE_PATH = join(here, 'vps.config.example.json')

export function normalizeConfig(raw) {
  if (!raw || typeof raw.host !== 'string' || !raw.host) {
    throw new Error('vps.config.json needs "host".')
  }
  const identityFile = typeof raw.identityFile === 'string' && raw.identityFile
    ? raw.identityFile.replace(/^~(?=[\\/])/, homedir())
    : null
  return {
    host: raw.host,
    user: typeof raw.user === 'string' && raw.user ? raw.user : 'root',
    port: Number(raw.port) || 22,
    identityFile,
    localPort: Number(raw.localPort) || REMOTE_PORT,
  }
}

export function sshArgs(cfg, { batch = true } = {}) {
  const args = ['-p', String(cfg.port), '-o', 'ConnectTimeout=10']
  if (batch) args.push('-o', 'BatchMode=yes')
  if (cfg.identityFile) args.push('-i', cfg.identityFile, '-o', 'IdentitiesOnly=yes')
  args.push(`${cfg.user}@${cfg.host}`)
  return args
}

export function systemctlCommand(cfg, action) {
  if (!['start', 'stop', 'restart'].includes(action)) {
    throw new Error(`Unsupported action ${action}.`)
  }
  const sudo = cfg.user === 'root' ? '' : 'sudo -n '
  return `${sudo}systemctl ${action} ${SERVICE}`
}

// One line per field so the output is easy to parse and still readable raw.
export const STATUS_SCRIPT = [
  `echo "active=$(systemctl is-active ${SERVICE} 2>/dev/null)"`,
  `echo "upSince=$(systemctl show ${SERVICE} -p ActiveEnterTimestamp --value 2>/dev/null)"`,
  `echo "downSince=$(systemctl show ${SERVICE} -p InactiveEnterTimestamp --value 2>/dev/null)"`,
  `echo "http=$(curl -s -o /dev/null -m 5 -w '%{http_code}' http://127.0.0.1:${REMOTE_PORT}/ 2>/dev/null)"`,
  `echo "host=$(hostname)"`,
].join('; ')

export function parseStatus(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf('=')
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  const active = out.active || 'unknown'
  const http = /^\d{3}$/.test(out.http || '') ? out.http : '000'
  return {
    host: out.host || '?',
    active,
    since: (active === 'active' ? out.upSince : out.downSince) || '',
    http,
    healthy: active === 'active' && http === '200',
  }
}

// `ss -Hltn` lines -> sorted loopback ports in the customer environment range.
export function parseListenPorts(text) {
  const ports = new Set()
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/127\.0\.0\.1:(\d+)\s/)
    const port = m ? Number(m[1]) : 0
    if (port >= ENV_PORT_MIN && port <= ENV_PORT_MAX) ports.add(port)
  }
  return [...ports].sort((a, b) => a - b)
}

export function forwardArgs(cfg, envPorts) {
  return [
    '-L', `${cfg.localPort}:127.0.0.1:${REMOTE_PORT}`,
    ...envPorts.flatMap(port => ['-L', `${port}:127.0.0.1:${port}`]),
  ]
}

function git(args) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' })
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() }
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Missing ${CONFIG_PATH}.`)
    console.error(`Copy ${EXAMPLE_PATH} to vps.config.json and fill it in.`)
    process.exit(2)
  }
  return normalizeConfig(JSON.parse(readFileSync(CONFIG_PATH, 'utf8')))
}

function remote(cfg, command) {
  const result = spawnSync('ssh', [...sshArgs(cfg), command], { encoding: 'utf8' })
  if (result.error) {
    return { ok: false, code: -1, stdout: '', stderr: `Could not run ssh: ${result.error.message}` }
  }
  return { ok: result.status === 0, code: result.status, stdout: result.stdout, stderr: result.stderr.trim() }
}

function readStatus(cfg) {
  const r = remote(cfg, STATUS_SCRIPT)
  if (r.code === 255 || r.code === -1) return { error: r.stderr || 'SSH failed.' }
  return parseStatus(r.stdout)
}

function printStatus(s) {
  if (s.error) {
    console.log(`SSH failed: ${s.error}`)
    return
  }
  console.log(`Host:        ${s.host}`)
  console.log(`Service:     ${SERVICE} is ${s.active}${s.since ? ` (since ${s.since})` : ''}`)
  console.log(`HTTP :${REMOTE_PORT}: ${s.http === '000' ? 'no answer' : s.http}`)
  console.log(s.healthy ? 'Control Plane is UP.' : 'Control Plane is DOWN or unhealthy.')
}

async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${question} [y/N] `)
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

async function waitForStatus(cfg, wantUp, seconds = 30) {
  const deadline = Date.now() + seconds * 1000
  let s = readStatus(cfg)
  while (!s.error && s.healthy !== wantUp && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000))
    s = readStatus(cfg)
  }
  return s
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

async function run(command, cfg, { yes, refArg }) {
  switch (command) {
    case 'test': {
      const r = remote(cfg, 'echo ok; hostname; uptime -p')
      if (!r.ok) {
        console.log(`SSH to ${cfg.user}@${cfg.host}:${cfg.port} FAILED (exit ${r.code}).`)
        if (r.stderr) console.log(r.stderr)
        return 1
      }
      const [, hostname, uptime] = r.stdout.trim().split(/\r?\n/)
      console.log(`SSH OK: ${cfg.user}@${cfg.host} (${hostname}, ${uptime})`)
      return 0
    }
    case 'status': {
      const s = readStatus(cfg)
      printStatus(s)
      return s.error ? 1 : (s.healthy ? 0 : 3)
    }
    case 'start':
    case 'stop':
    case 'restart': {
      if (command !== 'start' && !yes && !(await confirm(`${command} ${SERVICE} on ${cfg.host}? Customer apps keep running; only the Control Plane is affected.`))) {
        console.log('Cancelled.')
        return 0
      }
      const r = remote(cfg, systemctlCommand(cfg, command))
      if (!r.ok) {
        console.log(`systemctl ${command} failed (exit ${r.code}).`)
        if (r.stderr) console.log(r.stderr)
        if (/sudo/.test(r.stderr)) console.log('This user needs passwordless sudo for systemctl, or use "user": "root".')
        return 1
      }
      console.log(`systemctl ${command} ${SERVICE}: sent. Checking…`)
      const s = await waitForStatus(cfg, command !== 'stop')
      printStatus(s)
      return (command === 'stop' ? s.active !== 'active' : s.healthy) ? 0 : 1
    }
    case 'tunnel': {
      if (!(await portFree(cfg.localPort))) {
        console.log(`localhost:${cfg.localPort} is already in use. A tunnel may already be open; try http://localhost:${cfg.localPort}`)
        return 1
      }
      // Forward every customer environment too, so the Control Plane's http://localhost:<port> links open.
      const listening = remote(cfg, `ss -Hltn 'sport >= :${ENV_PORT_MIN} and sport <= :${ENV_PORT_MAX}'`)
      const envPorts = []
      for (const port of listening.ok ? parseListenPorts(listening.stdout) : []) {
        if (await portFree(port)) envPorts.push(port)
        else console.log(`Skipping environment port ${port}: already in use on this PC.`)
      }
      console.log(`Tunnel open: http://localhost:${cfg.localPort} -> ${cfg.host} 127.0.0.1:${REMOTE_PORT}`)
      if (envPorts.length) console.log(`Environments: ${envPorts.map(p => `http://localhost:${p}`).join('  ')}`)
      console.log('Press Ctrl+C to close it. The Control Plane keeps running on the VPS.')
      const child = spawn('ssh', [
        '-N',
        '-o', 'ExitOnForwardFailure=yes',
        '-o', 'ServerAliveInterval=30',
        ...forwardArgs(cfg, envPorts),
        ...sshArgs(cfg),
      ], { stdio: 'inherit' })
      process.on('SIGINT', () => child.kill())
      return await new Promise(resolve => child.on('exit', (code) => {
        console.log('Tunnel closed.')
        resolve(code ?? 0)
      }))
    }
    case 'deploy': {
      const ref = refArg || `origin/${BRANCH}`
      const fetched = git(['fetch', '--quiet', 'origin', BRANCH])
      if (!fetched.ok) {
        console.log(`git fetch failed: ${fetched.err}`)
        return 1
      }
      const target = git(['rev-parse', '--verify', `${ref}^{commit}`])
      if (!target.ok) {
        console.log(`Unknown ref ${ref}.`)
        return 1
      }
      if (!git(['merge-base', '--is-ancestor', target.out, `origin/${BRANCH}`]).ok) {
        console.log(`${target.out.slice(0, 12)} is not on origin/${BRANCH}. Push it first; the VPS only deploys from GitHub.`)
        return 1
      }
      const current = remote(cfg, `git -C ${REMOTE_ROOT} rev-parse HEAD`)
      if (current.code === 255 || current.code === -1) {
        console.log(`SSH failed: ${current.stderr}`)
        return 1
      }
      const from = current.stdout.trim()
      if (from === target.out) {
        console.log(`The VPS is already on ${from.slice(0, 12)}. Deploying again rebuilds and restarts the Control Plane.`)
      } else {
        console.log(`VPS: ${from.slice(0, 12) || 'unknown'} -> ${target.out.slice(0, 12)}`)
        const log = git(['log', '--oneline', '--no-decorate', '-20', `${from}..${target.out}`])
        if (log.ok && log.out) console.log(log.out)
      }
      if (!yes && !(await confirm(`Deploy ${target.out.slice(0, 12)} to ${cfg.host}? The Control Plane restarts (about a minute down). Customer apps keep running.`))) {
        console.log('Cancelled.')
        return 0
      }
      // Stream the workstation's copy of the script, so a commit that adds or changes it deploys with it.
      const sudo = cfg.user === 'root' ? '' : 'sudo -n '
      const child = spawn('ssh', [...sshArgs(cfg), `${sudo}bash -s -- ${target.out}`], { stdio: ['pipe', 'inherit', 'inherit'] })
      child.stdin.end(readFileSync(DEPLOY_SCRIPT, 'utf8').replace(/\r\n/g, '\n'))
      return await new Promise(resolve => child.on('exit', code => resolve(code ?? 1)))
    }
    default:
      console.log(`Unknown command "${command}". Use: ${COMMANDS.join(' | ')}`)
      return 2
  }
}

async function menu(cfg) {
  const items = [
    ['test', 'Test SSH connection'],
    ['status', 'Control Plane status'],
    ['start', 'Start Control Plane'],
    ['stop', 'Stop Control Plane'],
    ['restart', 'Restart Control Plane'],
    ['tunnel', `Open tunnel (browse http://localhost:${cfg.localPort} and environments)`],
    ['deploy', `Deploy origin/${BRANCH} to the VPS`],
  ]
  for (;;) {
    console.log(`\nNuxxion VPS ${cfg.user}@${cfg.host}`)
    items.forEach(([, label], i) => console.log(`  ${i + 1}) ${label}`))
    console.log('  q) Quit')
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const pick = (await rl.question('> ')).trim().toLowerCase()
    rl.close()
    if (pick === 'q' || pick === '') return 0
    const item = items[Number(pick) - 1] ?? items.find(([cmd]) => cmd === pick)
    if (!item) {
      console.log('Pick a number or q.')
      continue
    }
    console.log('')
    await run(item[0], cfg, { yes: false })
    if (item[0] === 'tunnel') return 0
  }
}

async function main() {
  const args = process.argv.slice(2)
  const yes = args.includes('--yes') || args.includes('-y')
  const [command, refArg] = args.filter(a => !a.startsWith('-'))
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: pnpm vps [${COMMANDS.join('|')}] [ref] [--yes]   (no command = menu)`)
    return 0
  }
  const cfg = loadConfig()
  return command ? run(command, cfg, { yes, refArg }) : menu(cfg)
}

const isEntry = process.argv[1]
  && resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(process.argv[1]).toLowerCase()
if (isEntry) {
  main().then(code => process.exit(code), (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
