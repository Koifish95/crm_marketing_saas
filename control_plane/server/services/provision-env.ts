import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { randomBytes } from 'node:crypto'

export function provisionedEnvAbsolutePath(envFileLocal: string, root = process.cwd()) {
  return isAbsolute(envFileLocal) ? envFileLocal : join(root, envFileLocal)
}

export function randomSessionPassword() {
  return randomBytes(24).toString('hex')
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
    `COMPOSE_PROJECT=${input.composeProject}`,
    `CONTAINER_NAME=${input.containerName}`,
    `HOST_PORT=${input.hostPort}`,
    `SQLITE_VOLUME=${input.sqliteVolume}`,
    `ASSETS_VOLUME=${input.assetsVolume}`,
    `EXPECTED_IMAGE=${input.expectedImage}`,
    `APP_ENV=${appEnv}`,
    `NUXT_SESSION_PASSWORD=${input.sessionPassword ?? randomSessionPassword()}`,
    'NUXT_AUTH_USERNAME=admin',
    `NUXT_AUTH_EMAIL=${input.adminEmail}`,
    'NUXT_AUTH_PASSWORD=setup',
    'NUXT_AUTH_MUST_CHANGE_PASSWORD=true',
    'NUXT_AUTH_RESET_PASSWORD=false',
    `NUXT_PUBLIC_APP_NAME=${input.displayName} Acquisition`,
    `NUXT_PUBLIC_BRAND_NAME=${input.displayName}`,
    `NUXT_PUBLIC_BRAND_LOCATION=${location}`,
    `NUXT_PUBLIC_TIMEZONE=${input.timezone}`,
    'SESSION_COOKIE_SECURE=false',
  ]
  return `${lines.join('\n')}\n`
}

export function writeProvisionedEnvFile(envFileLocal: string, contents: string, root = process.cwd()) {
  const path = provisionedEnvAbsolutePath(envFileLocal, root)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents, 'utf8')
  return path
}
