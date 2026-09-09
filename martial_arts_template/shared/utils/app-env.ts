export const APP_ENVS = ['dev', 'stage', 'production'] as const
export type AppEnv = (typeof APP_ENVS)[number]

export const APP_ENV_LABELS: Record<AppEnv, string> = {
  dev: 'DEV',
  stage: 'STAGE',
  production: 'PRODUCTION',
}

export const APP_ENV_HOST_PORTS: Record<AppEnv, number> = {
  production: 5000,
  stage: 5010,
  dev: 5020,
}

/** Optional public hostnames per environment. Empty until a customer is given real DNS (S5). */
export const APP_ENV_PUBLIC_HOSTS: Record<AppEnv, string> = {
  production: '',
  stage: '',
  dev: '',
}

export const APP_ENV_SWITCHER_ORDER = ['production', 'stage', 'dev'] as const satisfies readonly AppEnv[]

export const APP_ENV_ISOLATION_MARKERS: Record<AppEnv, string> = {
  dev: 'm10a-dev-isolation',
  stage: 'm10a-stage-isolation',
  production: 'm10a-prod-isolation',
}

export function isolationMarkerFileName(appEnv: AppEnv) {
  return `${APP_ENV_ISOLATION_MARKERS[appEnv]}.txt`
}

export function isolationMarkerFileNames() {
  return APP_ENVS.map(env => isolationMarkerFileName(env))
}

export function isIsolationMarkerFileName(name: string) {
  return isolationMarkerFileNames().includes(name)
}

export function parseAppEnv(raw: string | undefined, nodeEnv?: string): AppEnv {
  const value = raw?.trim().toLowerCase()
  if (!value) {
    return nodeEnv === 'production' ? 'production' : 'dev'
  }
  if ((APP_ENVS as readonly string[]).includes(value)) {
    return value as AppEnv
  }
  throw new Error(`Invalid APP_ENV="${raw}". Expected one of: ${APP_ENVS.join(', ')}.`)
}

export function readAppEnv(env: NodeJS.Dict<string | undefined> = process.env): AppEnv {
  return parseAppEnv(env.APP_ENV, env.NODE_ENV)
}

export function isNonProductionAppEnv(appEnv: AppEnv): boolean {
  return appEnv !== 'production'
}

export function sessionCookieSecure(appEnv: AppEnv, explicit?: string): boolean {
  const raw = explicit?.trim().toLowerCase()
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  return appEnv === 'production'
}

export function impliedHostPort(protocol: string, port: string | number | null | undefined): number | null {
  const raw = String(port ?? '').trim()
  if (raw) {
    const parsed = Number.parseInt(raw, 10)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }
  if (protocol === 'https:' || protocol === 'https') {
    return 443
  }
  if (protocol === 'http:' || protocol === 'http') {
    return 80
  }
  return null
}

export function appEnvForHostPort(port: number | string | null | undefined): AppEnv | null {
  const parsed = typeof port === 'number' ? port : Number.parseInt(String(port ?? ''), 10)
  if (!Number.isInteger(parsed)) {
    return null
  }
  for (const env of APP_ENVS) {
    if (APP_ENV_HOST_PORTS[env] === parsed) {
      return env
    }
  }
  return null
}

export function environmentSwitcherUrl(input: {
  protocol: string
  hostname: string
  port: number
  pathname?: string
  search?: string
  hash?: string
}): string {
  const protocol = input.protocol.endsWith(':') ? input.protocol : `${input.protocol}:`
  const path = `${input.pathname || '/'}${input.search || ''}${input.hash || ''}`
  return `${protocol}//${input.hostname}:${input.port}${path}`
}

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '')
}

export function appEnvForHostname(hostname: string): AppEnv | null {
  const host = normalizeHostname(hostname)
  if (!host) {
    return null
  }
  for (const env of APP_ENVS) {
    const configured = APP_ENV_PUBLIC_HOSTS[env]
    if (configured && configured === host) {
      return env
    }
  }
  return null
}

export function isConfiguredPublicHostname(hostname: string): boolean {
  return appEnvForHostname(hostname) !== null
}

/** @deprecated Use isConfiguredPublicHostname. Kept so old imports fail loudly if missed. */
export function isRenzoPublicHostname(hostname: string): boolean {
  return isConfiguredPublicHostname(hostname)
}

export function publicHostnameForEnv(env: AppEnv): string {
  return APP_ENV_PUBLIC_HOSTS[env]
}

export function currentAppEnvFromLocation(input: {
  protocol: string
  hostname: string
  port?: string | number | null
}): AppEnv | null {
  const fromHost = appEnvForHostname(input.hostname)
  if (fromHost) {
    return fromHost
  }
  return appEnvForHostPort(impliedHostPort(input.protocol, input.port))
}

export function environmentSwitcherHref(input: {
  protocol: string
  hostname: string
  port?: string | number | null
  pathname?: string
  search?: string
  hash?: string
  targetEnv: AppEnv
}): string {
  const protocol = input.protocol.endsWith(':') ? input.protocol : `${input.protocol}:`
  const path = `${input.pathname || '/'}${input.search || ''}${input.hash || ''}`
  const host = normalizeHostname(input.hostname)
  if (appEnvForHostname(host)) {
    const targetHost = publicHostnameForEnv(input.targetEnv)
    return `${protocol}//${targetHost}${path}`
  }
  return environmentSwitcherUrl({
    protocol,
    hostname: input.hostname,
    port: APP_ENV_HOST_PORTS[input.targetEnv],
    pathname: input.pathname,
    search: input.search,
    hash: input.hash,
  })
}
