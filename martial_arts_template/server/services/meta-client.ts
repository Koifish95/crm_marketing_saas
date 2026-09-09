export const META_GRAPH_API_VERSION = 'v25.0'
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code?: number,
    readonly kind?: 'token' | 'permission' | 'rate_limit' | 'network' | 'malformed' | 'config',
  ) {
    super(message)
  }
}

export interface MetaGraphClient {
  getJson(path: string, query?: Record<string, string>): Promise<unknown>
}

export function metaEnv() {
  const token = process.env.META_ACCESS_TOKEN?.trim() || ''
  const account = process.env.META_AD_ACCOUNT_ID?.trim() || ''
  const version = process.env.META_GRAPH_API_VERSION?.trim() || META_GRAPH_API_VERSION
  return {
    configured: Boolean(token && account),
    accessToken: token,
    adAccountId: account.startsWith('act_') || !account ? account : `act_${account}`,
    version,
  }
}

function classifyMetaError(code: number | undefined, message: string) {
  if (code === 190 || /validat(e|ing) access token|expired|invalid.*token/i.test(message)) {
    return { statusCode: 401, kind: 'token' as const, summary: 'Meta access token is invalid or expired.' }
  }
  if (code === 10 || code === 200 || /permission|ads_read|missing permissions/i.test(message)) {
    return { statusCode: 403, kind: 'permission' as const, summary: 'Meta API permission was denied. ads_read is required for read-only sync.' }
  }
  if (code === 4 || code === 17 || code === 32 || code === 613 || code === 80004 || /rate limit|too many calls/i.test(message)) {
    return { statusCode: 429, kind: 'rate_limit' as const, summary: 'Meta API rate limit was reached.' }
  }
  return { statusCode: 502, kind: 'network' as const, summary: 'Meta API request failed.' }
}

export function createMetaGraphClient(options?: { accessToken?: string, version?: string }): MetaGraphClient {
  const env = metaEnv()
  const token = options?.accessToken ?? env.accessToken
  const version = options?.version ?? env.version
  const base = `https://graph.facebook.com/${version}`

  return {
    async getJson(path, query = {}) {
      if (!token) {
        throw new MetaApiError('Meta is not configured.', 400, undefined, 'config')
      }
      const absolute = path.startsWith('http')
      const url = absolute ? new URL(path) : new URL(`${base}/${path.replace(/^\//, '')}`)
      if (!absolute) {
        for (const [key, value] of Object.entries(query)) {
          url.searchParams.set(key, value)
        }
        url.searchParams.set('access_token', token)
      }
      let response: Response
      try {
        response = await fetch(url)
      } catch {
        throw new MetaApiError('Could not reach the Meta Graph API.', 502, undefined, 'network')
      }
      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new MetaApiError('Meta returned a malformed payload.', 502, undefined, 'malformed')
      }
      const error = (payload as { error?: { message?: string, code?: number } }).error
      if (error) {
        const classified = classifyMetaError(error.code, error.message || '')
        throw new MetaApiError(classified.summary, classified.statusCode, error.code, classified.kind)
      }
      if (!response.ok) {
        throw new MetaApiError('Meta API request failed.', 502, undefined, 'network')
      }
      return payload
    },
  }
}
