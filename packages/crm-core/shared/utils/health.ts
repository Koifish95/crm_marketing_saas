import { CORE_PACKAGE_NAME } from './identity'
import { publicBrand } from './brand'
import { readAppEnv } from './app-env'

export function coreHealthBody(input: {
  appName?: string
  timezone?: string
  database?: 'reachable'
} = {}) {
  const brand = publicBrand()
  return {
    ok: true as const,
    app: input.appName || brand.appName,
    timezone: input.timezone || process.env.NUXT_PUBLIC_TIMEZONE || 'America/Denver',
    appEnv: readAppEnv(),
    core: CORE_PACKAGE_NAME,
    ...(input.database ? { database: input.database } : {}),
  }
}
