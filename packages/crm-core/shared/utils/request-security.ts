export const CSRF_REJECTED_MESSAGE = 'Cross-origin request rejected.'
export const DEFAULT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024
export const DEFAULT_ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'application/pdf',
] as const

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'off',
}

export function parseCommaList(raw: string | undefined) {
  return (raw || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

export function parseIpList(raw: string | undefined) {
  return parseCommaList(raw)
    .map(value => normalizeIp(value))
    .filter((value): value is string => Boolean(value))
}

export function parseOriginList(raw: string | undefined) {
  return parseCommaList(raw).map(value => value.replace(/\/$/, ''))
}

export function normalizeIp(value: string | null | undefined) {
  if (!value) {
    return null
  }
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return null
  }
  return trimmed.replace(/^::ffff:/, '')
}

export function isLoopbackAddress(value: string | null | undefined) {
  const ip = normalizeIp(value)
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
}

export function firstForwardedFor(value: string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) {
    return null
  }
  return normalizeIp(raw.split(',')[0])
}

export function trustedClientIp(input: {
  remoteAddress?: string | null
  forwardedFor?: string | string[] | null
  trustedProxies?: readonly string[]
}) {
  const remote = normalizeIp(input.remoteAddress)
  const trusted = input.trustedProxies || []
  if (remote && trusted.includes(remote)) {
    return firstForwardedFor(input.forwardedFor) || remote
  }
  return remote
}

export function mutatingMethod(method: string | undefined) {
  const value = (method || 'GET').toUpperCase()
  return value !== 'GET' && value !== 'HEAD' && value !== 'OPTIONS'
}

export function originFromReferer(referer: string | null | undefined) {
  if (!referer) {
    return null
  }
  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

export function requestOrigin(origin: string | null | undefined, referer?: string | null) {
  const direct = origin?.trim()
  if (direct) {
    return direct.replace(/\/$/, '')
  }
  return originFromReferer(referer)
}

export function allowedOriginsFrom(input: {
  host?: string | null
  protocol?: string | null
  publicOrigin?: string | null
  extra?: readonly string[]
}) {
  const origins = new Set<string>()
  const publicOrigin = input.publicOrigin?.trim().replace(/\/$/, '')
  if (publicOrigin) {
    origins.add(publicOrigin)
  }
  const host = input.host?.split(',')[0]?.trim()
  if (host) {
    const protocol = input.protocol === 'https' ? 'https' : 'http'
    origins.add(`${protocol}://${host}`)
    if (host.startsWith('127.0.0.1')) {
      origins.add(`${protocol}://localhost${host.slice('127.0.0.1'.length)}`)
    }
    if (host.startsWith('localhost')) {
      origins.add(`${protocol}://127.0.0.1${host.slice('localhost'.length)}`)
    }
  }
  for (const extra of input.extra || []) {
    const value = extra.trim().replace(/\/$/, '')
    if (value) {
      origins.add(value)
    }
  }
  return [...origins]
}

export function assertMutatingOrigin(input: {
  method?: string
  origin?: string | null
  referer?: string | null
  host?: string | null
  protocol?: string | null
  publicOrigin?: string | null
  extraOrigins?: readonly string[]
  remoteAddress?: string | null
}) {
  if (!mutatingMethod(input.method)) {
    return { ok: true as const }
  }
  const allowed = allowedOriginsFrom({
    host: input.host,
    protocol: input.protocol,
    publicOrigin: input.publicOrigin,
    extra: input.extraOrigins,
  })
  const origin = requestOrigin(input.origin, input.referer)
  if (origin && allowed.includes(origin)) {
    return { ok: true as const }
  }
  if (!origin && isLoopbackAddress(input.remoteAddress)) {
    return { ok: true as const }
  }
  return {
    ok: false as const,
    statusCode: 403,
    message: CSRF_REJECTED_MESSAGE,
  }
}

export function forwardedProto(value: string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const proto = raw?.split(',')[0]?.trim().toLowerCase()
  return proto === 'https' || proto === 'http' ? proto : null
}

export function requestIsHttps(input: {
  forwardedProto?: string | string[] | null
  encrypted?: boolean
  publicOrigin?: string | null
  remoteAddress?: string | null
  trustedProxies?: readonly string[]
}) {
  if (input.publicOrigin?.startsWith('https://')) {
    return true
  }
  const remote = normalizeIp(input.remoteAddress)
  const trusted = input.trustedProxies || []
  if (remote && trusted.includes(remote)) {
    if (forwardedProto(input.forwardedProto) === 'https') {
      return true
    }
  }
  return input.encrypted === true
}

export function applySecurityHeaders(headers: Record<string, string>, input: { https?: boolean } = {}) {
  const next = { ...headers, ...SECURITY_HEADERS }
  if (input.https) {
    next['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }
  return next
}

export function uploadMaxBytes(raw?: string) {
  if (!raw?.trim()) {
    return DEFAULT_UPLOAD_MAX_BYTES
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('ASSET_UPLOAD_MAX_BYTES must be a positive integer.')
  }
  return parsed
}

export function isAllowedUploadType(mediaType: string, allowed: readonly string[] = DEFAULT_ALLOWED_UPLOAD_TYPES) {
  const value = mediaType.trim().toLowerCase()
  return allowed.includes(value)
}
