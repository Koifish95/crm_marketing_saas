import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { randomBytes } from 'node:crypto'

export function provisionedEnvAbsolutePath(envFileLocal: string, root = process.cwd()) {
  return isAbsolute(envFileLocal) ? envFileLocal : join(root, envFileLocal)
}

export function randomSessionPassword() {
  return randomBytes(24).toString('hex')
}

function envLine(key: string, value: string | number) {
  return `${key}="${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
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
}) {
  const appEnv = input.type === 'PROD' ? 'production' : 'dev'
  const location = input.type === 'PROD' ? 'PROD' : 'DEV'
  const lines = [
    envLine('COMPOSE_PROJECT', input.composeProject),
    envLine('CONTAINER_NAME', input.containerName),
    envLine('HOST_PORT', input.hostPort),
    envLine('SQLITE_VOLUME', input.sqliteVolume),
    envLine('ASSETS_VOLUME', input.assetsVolume),
    envLine('EXPECTED_IMAGE', input.expectedImage),
    envLine('APP_ENV', appEnv),
    envLine('NUXT_SESSION_PASSWORD', input.sessionPassword ?? randomSessionPassword()),
    envLine('NUXT_AUTH_USERNAME', 'admin'),
    envLine('NUXT_AUTH_EMAIL', input.adminEmail),
    envLine('NUXT_AUTH_PASSWORD', 'setup'),
    envLine('NUXT_AUTH_MUST_CHANGE_PASSWORD', 'true'),
    envLine('NUXT_AUTH_RESET_PASSWORD', 'false'),
    envLine('NUXT_PUBLIC_APP_NAME', `${input.displayName} Acquisition`),
    envLine('NUXT_PUBLIC_BRAND_NAME', input.displayName),
    envLine('NUXT_PUBLIC_BRAND_LOCATION', location),
    envLine('NUXT_PUBLIC_TIMEZONE', input.timezone),
    envLine('SESSION_COOKIE_SECURE', 'false'),
  ]
  return `${lines.join('\n')}\n`
}

export function writeProvisionedEnvFile(envFileLocal: string, contents: string, root = process.cwd()) {
  const path = provisionedEnvAbsolutePath(envFileLocal, root)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents, 'utf8')
  return path
}
