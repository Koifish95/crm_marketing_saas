import { existsSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { LAB_ENVIRONMENTS } from '../database/lab-seed'
import { PROVISIONED_COMPOSE_FILE } from './provision-contract'

const FORBIDDEN = ['-v', '--volumes', 'prune', 'down']
const LAB_COMPOSE = LAB_ENVIRONMENTS.map(row => row.composeFile)
const LAB_SLUGS = LAB_ENVIRONMENTS.map(row => row.slug)
const SAFE_NAME = /^[a-z0-9][a-z0-9-]{2,62}$/

export function templateRoot() {
  return process.env.TEMPLATE_ROOT?.trim() || join(process.cwd(), '..', 'martial_arts_template')
}

export function repoRoot() {
  return join(templateRoot(), '..')
}

export function assertSafeRelaunch(input: {
  slug: string
  composeFile: string
}) {
  const blob = `${input.slug} ${input.composeFile}`.toLowerCase()
  if (blob.includes('renzo') || blob.includes('webhosting')) {
    throw new Error(`Refusing relaunch for ${input.slug}. Reserved names only.`)
  }
  if (LAB_COMPOSE.includes(input.composeFile as typeof LAB_COMPOSE[number])) {
    if (!LAB_SLUGS.includes(input.slug as typeof LAB_SLUGS[number])) {
      throw new Error(`Refusing relaunch for ${input.slug}. Lab compose is for lab-acme only.`)
    }
    return
  }
  if (input.composeFile !== PROVISIONED_COMPOSE_FILE) {
    throw new Error(`Refusing compose file ${input.composeFile}.`)
  }
  if (!SAFE_NAME.test(input.slug)) {
    throw new Error(`Refusing relaunch for ${input.slug}.`)
  }
}

export function resolveComposeEnvFile(input: {
  envFileLocal: string
  envFileExample: string
  root?: string
  filesRoot?: string
}) {
  const root = input.root ?? templateRoot()
  const candidates = [
    input.envFileLocal,
    isAbsolute(input.envFileLocal) ? input.envFileLocal : join(input.filesRoot ?? process.cwd(), input.envFileLocal),
    join(root, input.envFileLocal),
    join(root, input.envFileExample),
    input.envFileExample,
  ]
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return isAbsolute(candidate) ? candidate : join(process.cwd(), candidate)
    }
  }
  return existsSync(join(root, input.envFileExample))
    ? join(root, input.envFileExample)
    : input.envFileExample
}

export function composeDecommissionArgs(input: {
  envFile: string
  composeFile: string
  composeProject?: string
}) {
  const args = ['compose', '--env-file', input.envFile, '-f', input.composeFile]
  if (input.composeProject) {
    args.push('-p', input.composeProject)
  }
  args.push('rm', '-f', '--stop', 'app')
  if (args.some(part => FORBIDDEN.some(token => part === token || part.includes(token)))) {
    throw new Error('Refusing a forbidden Docker argument.')
  }
  return args
}

export function composeStopArgs(input: {
  envFile: string
  composeFile: string
  composeProject?: string
}) {
  const args = ['compose', '--env-file', input.envFile, '-f', input.composeFile]
  if (input.composeProject) {
    args.push('-p', input.composeProject)
  }
  args.push('stop', 'app')
  if (args.some(part => FORBIDDEN.some(token => part === token || part.includes(token)))) {
    throw new Error('Refusing a forbidden Docker argument.')
  }
  return args
}

export function composeStartArgs(input: {
  envFile: string
  composeFile: string
  composeProject?: string
}) {
  const args = ['compose', '--env-file', input.envFile, '-f', input.composeFile]
  if (input.composeProject) {
    args.push('-p', input.composeProject)
  }
  args.push('start', 'app')
  if (args.some(part => FORBIDDEN.some(token => part === token || part.includes(token)))) {
    throw new Error('Refusing a forbidden Docker argument.')
  }
  return args
}

export function composeArgs(input: {
  envFile: string
  composeFile: string
  composeProject?: string
  recreate?: boolean
}) {
  const args = ['compose', '--env-file', input.envFile, '-f', input.composeFile]
  if (input.composeProject) {
    args.push('-p', input.composeProject)
  }
  args.push('up', '-d')
  if (input.recreate) {
    args.push('--force-recreate')
  }
  args.push('--no-deps', 'app')
  if (args.some(part => FORBIDDEN.some(token => part === token || part.includes(token)))) {
    throw new Error('Refusing a forbidden Docker argument.')
  }
  return args
}

export function relaunchCommand(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
  root?: string
  filesRoot?: string
}) {
  assertSafeRelaunch(input)
  const root = input.root ?? templateRoot()
  const envFile = resolveComposeEnvFile({
    envFileLocal: input.envFileLocal,
    envFileExample: input.envFileExample,
    root,
    filesRoot: input.filesRoot,
  })
  return {
    cwd: root,
    args: composeArgs({
      envFile,
      composeFile: input.composeFile,
      composeProject: input.composeProject,
      recreate: true,
    }),
  }
}

export function stopCommand(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
  root?: string
  filesRoot?: string
}) {
  assertSafeRelaunch(input)
  const root = input.root ?? templateRoot()
  const envFile = resolveComposeEnvFile({
    envFileLocal: input.envFileLocal,
    envFileExample: input.envFileExample,
    root,
    filesRoot: input.filesRoot,
  })
  return {
    cwd: root,
    args: composeStopArgs({
      envFile,
      composeFile: input.composeFile,
      composeProject: input.composeProject,
    }),
  }
}

export function startCommand(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
  root?: string
  filesRoot?: string
}) {
  assertSafeRelaunch(input)
  const root = input.root ?? templateRoot()
  const envFile = resolveComposeEnvFile({
    envFileLocal: input.envFileLocal,
    envFileExample: input.envFileExample,
    root,
    filesRoot: input.filesRoot,
  })
  return {
    cwd: root,
    args: composeStartArgs({
      envFile,
      composeFile: input.composeFile,
      composeProject: input.composeProject,
    }),
  }
}

export function decommissionCommand(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
  root?: string
  filesRoot?: string
}) {
  assertSafeRelaunch(input)
  const root = input.root ?? templateRoot()
  const envFile = resolveComposeEnvFile({
    envFileLocal: input.envFileLocal,
    envFileExample: input.envFileExample,
    root,
    filesRoot: input.filesRoot,
  })
  return {
    cwd: root,
    args: composeDecommissionArgs({
      envFile,
      composeFile: input.composeFile,
      composeProject: input.composeProject,
    }),
  }
}

export function decommissionRegisteredEnvironment(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
  filesRoot?: string
}) {
  const command = decommissionCommand(input)
  const result = spawnSync('docker', command.args, {
    cwd: command.cwd,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    const text = `${result.stderr || ''} ${result.stdout || ''}`
    if (!/no such|not found|does not exist/i.test(text)) {
      throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Decommission failed.')
    }
  }
  return {
    slug: input.slug,
    args: command.args,
    stdout: result.stdout,
  }
}

export function stopRegisteredEnvironment(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
}) {
  const command = stopCommand(input)
  const result = spawnSync('docker', command.args, {
    cwd: command.cwd,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Stop failed.')
  }
  return {
    slug: input.slug,
    args: command.args,
    stdout: result.stdout,
  }
}

export function startRegisteredEnvironment(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
}) {
  const command = startCommand(input)
  const result = spawnSync('docker', command.args, {
    cwd: command.cwd,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Start failed.')
  }
  return {
    slug: input.slug,
    args: command.args,
    stdout: result.stdout,
  }
}

export function relaunchRegisteredEnvironment(input: {
  slug: string
  composeFile: string
  envFileLocal: string
  envFileExample: string
  composeProject?: string
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
