import { CORE_PACKAGE_NAME } from './identity'
import { publicBrand } from './brand'
import { readAppEnv } from './app-env'

export function releaseIdentity(env: NodeJS.Dict<string | undefined> = process.env) {
  return (env.RELEASE_ID || env.GIT_SHA || 'dev').trim() || 'dev'
}

export function coreHealthBody(input: {
  appName?: string
  timezone?: string
  database?: 'reachable'
  releaseId?: string
  schemaVersion?: string
  warnings?: string[]
} = {}) {
  const brand = publicBrand()
  const warnings = input.warnings?.filter(Boolean) || []
  return {
    ok: true as const,
    app: input.appName || brand.appName,
    timezone: input.timezone || process.env.NUXT_PUBLIC_TIMEZONE || 'America/Denver',
    appEnv: readAppEnv(),
    core: CORE_PACKAGE_NAME,
    releaseId: input.releaseId || releaseIdentity(),
    ...(input.schemaVersion ? { schemaVersion: input.schemaVersion } : {}),
    ...(input.database ? { database: input.database } : {}),
    ...(warnings.length ? { warnings } : {}),
  }
}
