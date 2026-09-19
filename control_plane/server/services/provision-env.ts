import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { ProductDefinition } from '../products/catalog'
import { MARTIAL_ARTS_PRODUCT } from '../products/catalog'

const FORBIDDEN_BOOTSTRAP_PASSWORDS = ['setup']

export function isForbiddenBootstrapPassword(password: string) {
  return FORBIDDEN_BOOTSTRAP_PASSWORDS.includes(password.trim().toLowerCase())
}

export function generateInitialAccessPassword() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const password = `A${randomBytes(12).toString('base64url')}!`
    if (password.length >= 8 && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password) && !isForbiddenBootstrapPassword(password)) {
      return password
    }
  }
  throw new Error('Unable to generate a unique initial-access password.')
}

export function provisionedEnvAbsolutePath(envFileLocal: string, root = process.cwd()) {
  return isAbsolute(envFileLocal) ? envFileLocal : join(root, envFileLocal)
}

export function randomSessionPassword() {
  return randomBytes(24).toString('hex')
}

export function resolveInitialAccessPassword(explicit?: string) {
  const password = explicit?.trim()
  if (!password) {
    return generateInitialAccessPassword()
  }
  if (isForbiddenBootstrapPassword(password)) {
    throw new Error('Refusing universal bootstrap password "setup". Provision a unique initial-access password.')
  }
  return password
}

function envLine(key: string, value: string | number) {
  return `${key}="${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

export function publicAppName(displayName: string, template: ProductDefinition['appNameTemplate'] = 'acquisition') {
  return template === 'plain' ? displayName : `${displayName} Acquisition`
}

export function publicEnvSettings(input: {
  publicHostname?: string | null
  hostBind?: string
  nodeKind?: string
}) {
  const publicOrigin = input.publicHostname
    ? `https://${input.publicHostname.trim().toLowerCase().replace(/\.$/, '')}`
    : ''
  const vpsBind = input.nodeKind === 'vps' || Boolean(publicOrigin)
  return {
    publicOrigin,
    hostBind: input.hostBind || (vpsBind ? '127.0.0.1' : '0.0.0.0'),
    trustedProxyIps: publicOrigin ? '127.0.0.1' : '',
    sessionCookieSecure: publicOrigin ? 'true' : 'false',
  }
}

export function renderProvisionedEnv(input: {
  composeProject: string
  containerName: string
  hostPort: number
  sqliteVolume: string
  assetsVolume: string
  expectedImage: string
  type: string
  displayName: string
  adminEmail: string
  timezone: string
  sessionPassword?: string
  authPassword?: string
  hostBind?: string
  trustedProxyIps?: string
  releaseId?: string
  publicHostname?: string | null
  nodeKind?: string
  product?: Pick<ProductDefinition, 'appNameTemplate' | 'extraEnv'>
}) {
  const product = input.product ?? MARTIAL_ARTS_PRODUCT
  const appEnv = input.type === 'PROD' ? 'production' : 'dev'
  const location = input.type === 'PROD' ? 'PROD' : 'DEV'
  const authPassword = resolveInitialAccessPassword(input.authPassword)
  const publicSettings = publicEnvSettings({
    publicHostname: input.publicHostname,
    hostBind: input.hostBind,
    nodeKind: input.nodeKind,
  })
  const lines = [
    envLine('COMPOSE_PROJECT', input.composeProject),
    envLine('CONTAINER_NAME', input.containerName),
    envLine('HOST_PORT', input.hostPort),
    envLine('HOST_BIND', publicSettings.hostBind),
    envLine('SQLITE_VOLUME', input.sqliteVolume),
    envLine('ASSETS_VOLUME', input.assetsVolume),
    envLine('EXPECTED_IMAGE', input.expectedImage),
    envLine('APP_ENV', appEnv),
    envLine('NUXT_SESSION_PASSWORD', input.sessionPassword ?? randomSessionPassword()),
    envLine('NUXT_AUTH_USERNAME', 'admin'),
    envLine('NUXT_AUTH_EMAIL', input.adminEmail),
    envLine('NUXT_AUTH_PASSWORD', authPassword),
    envLine('NUXT_AUTH_MUST_CHANGE_PASSWORD', 'true'),
    envLine('NUXT_AUTH_RESET_PASSWORD', 'false'),
    envLine('NUXT_PUBLIC_APP_NAME', publicAppName(input.displayName, product.appNameTemplate)),
    envLine('NUXT_PUBLIC_BRAND_NAME', input.displayName),
    envLine('NUXT_PUBLIC_BRAND_LOCATION', location),
    envLine('NUXT_PUBLIC_TIMEZONE', input.timezone),
    envLine('NUXT_PUBLIC_ORIGIN', publicSettings.publicOrigin),
    envLine('SESSION_COOKIE_SECURE', publicSettings.sessionCookieSecure),
    envLine('TRUSTED_PROXY_IPS', input.trustedProxyIps ?? publicSettings.trustedProxyIps),
    envLine('RELEASE_ID', input.releaseId || 'dev'),
    envLine('APP_BACKUP_DIR', '/app/data/sqlite/backups'),
    ...Object.entries(product.extraEnv).map(([key, value]) => envLine(key, value)),
  ]
  return {
    contents: `${lines.join('\n')}\n`,
    authPassword,
    username: 'admin',
  }
}

export function patchEnvFileContents(contents: string, updates: Record<string, string>) {
  const keys = new Set(Object.keys(updates))
  const seen = new Set<string>()
  const lines = contents.split(/\r?\n/)
  const next = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/)
    const key = match?.[1]
    if (!key || !keys.has(key)) {
      return line
    }
    seen.add(key)
    return envLine(key, updates[key] ?? '')
  })
  for (const key of keys) {
    if (!seen.has(key)) {
      const insertAt = next.length > 0 && next[next.length - 1] === '' ? next.length - 1 : next.length
      next.splice(insertAt, 0, envLine(key, updates[key] ?? ''))
    }
  }
  const body = next.join('\n')
  return body.endsWith('\n') ? body : `${body}\n`
}

export function patchProvisionedEnvFile(
  envFileLocal: string,
  updates: Record<string, string>,
  root = process.cwd(),
) {
  const path = provisionedEnvAbsolutePath(envFileLocal, root)
  const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const next = patchEnvFileContents(current, updates)
  writeSecretFile(path, next)
  return path
}

export function writeSecretFile(path: string, contents: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents, { encoding: 'utf8', mode: 0o600 })
  try {
    chmodSync(path, 0o600)
  } catch {
    // Windows may ignore POSIX modes.
  }
  return path
}

export function writeProvisionedEnvFile(envFileLocal: string, contents: string, root = process.cwd()) {
  return writeSecretFile(provisionedEnvAbsolutePath(envFileLocal, root), contents)
}

export function writeInitialAccessFile(envFileLocal: string, input: {
  username: string
  password: string
  email: string
}, root = process.cwd()) {
  const envPath = provisionedEnvAbsolutePath(envFileLocal, root)
  const path = envPath.replace(/\.env$/i, '.initial-access.txt')
  const body = [
    'Martial Arts CRM initial access. Deliver once, then the academy admin must change this password.',
    `username=${input.username}`,
    `email=${input.email}`,
    `password=${input.password}`,
    'mustChangePassword=true',
    '',
  ].join('\n')
  return writeSecretFile(path, body)
}
