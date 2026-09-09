import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { LAB_ENVIRONMENTS } from '../database/lab-seed'

const FORBIDDEN = ['-v', '--volumes', 'prune', 'down']
const ALLOWED_COMPOSE = LAB_ENVIRONMENTS.map(row => row.composeFile)
const ALLOWED_SLUGS = LAB_ENVIRONMENTS.map(row => row.slug)

export function templateRoot() {
  return process.env.TEMPLATE_ROOT?.trim() || join(process.cwd(), '..', 'martial_arts_template')
}

export function assertSafeRelaunch(input: {
  slug: string
  composeFile: string
}) {
  if (!ALLOWED_SLUGS.includes(input.slug as typeof ALLOWED_SLUGS[number])) {
    throw new Error(`Refusing relaunch for ${input.slug}. Registered lab-acme environments only.`)
  }
  if (!ALLOWED_COMPOSE.includes(input.composeFile as typeof ALLOWED_COMPOSE[number])) {
    throw new Error(`Refusing compose file ${input.composeFile}.`)
  }
}

export function relaunchCommand(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  root?: string
}) {
  assertSafeRelaunch(input)
  const root = input.root ?? templateRoot()
  const envFile = existsSync(join(root, input.envFileLocal)) ? input.envFileLocal : input.envFileExample
  const args = ['compose', '--env-file', envFile, '-f', input.composeFile, 'up', '-d', '--force-recreate', '--no-deps', 'app']
  if (args.some(part => FORBIDDEN.some(token => part === token || part.includes(token)))) {
    throw new Error('Refusing a forbidden Docker argument.')
  }
  return { cwd: root, args }
}

export function relaunchRegisteredEnvironment(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
}) {
  const command = relaunchCommand(input)
  const result = spawnSync('docker', command.args, {
    cwd: command.cwd,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Relaunch failed.')
  }
  return {
    slug: input.slug,
    args: command.args,
    stdout: result.stdout,
  }
}
