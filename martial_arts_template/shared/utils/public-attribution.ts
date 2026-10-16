export const PUBLIC_ATTRIBUTION_STORAGE_KEY = 'ma-trial-attribution'

export interface PublicAttributionFields {
  source?: string
  campaign?: string
  trackingCode?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
}

function asQueryString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}

export function attributionFromQuery(query: Record<string, unknown>): PublicAttributionFields | null {
  const value: PublicAttributionFields = {
    source: asQueryString(query.source),
    campaign: asQueryString(query.campaign),
    trackingCode: asQueryString(query.c),
    utmSource: asQueryString(query.utm_source),
    utmMedium: asQueryString(query.utm_medium),
    utmContent: asQueryString(query.utm_content),
    utmTerm: asQueryString(query.utm_term),
  }
  return Object.values(value).some(Boolean) ? value : null
}

export function writePublicAttribution(value: PublicAttributionFields) {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  sessionStorage.setItem(PUBLIC_ATTRIBUTION_STORAGE_KEY, JSON.stringify(value))
}

export function readStoredPublicAttribution(): PublicAttributionFields | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }
  const stored = sessionStorage.getItem(PUBLIC_ATTRIBUTION_STORAGE_KEY)
  if (!stored) {
    return null
  }
  try {
    return JSON.parse(stored) as PublicAttributionFields
  } catch {
    return null
  }
}

export interface TrackingRedirectInput {
  destinationPath: string
  trackingCode?: string | null
  campaign?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmContent?: string | null
  utmTerm?: string | null
}

const TRACKING_REDIRECT_BASE = 'http://127.0.0.1'

function setAttributionParam(url: URL, key: string, value: string | null | undefined) {
  const trimmed = value?.trim()
  if (trimmed) {
    url.searchParams.set(key, trimmed)
  }
}

/** Internal path plus the query `/trial` and event registration already read. */
export function trackingRedirectPath(input: TrackingRedirectInput) {
  const dest = input.destinationPath.trim()
  if (!dest.startsWith('/') || dest.startsWith('//') || dest.includes('://') || dest.includes('\\')) {
    throw new Error('Tracking destination must be an internal path.')
  }
  const url = new URL(dest, TRACKING_REDIRECT_BASE)
  if (url.origin !== TRACKING_REDIRECT_BASE) {
    throw new Error('Tracking destination must be an internal path.')
  }
  setAttributionParam(url, 'c', input.trackingCode)
  setAttributionParam(url, 'campaign', input.campaign)
  setAttributionParam(url, 'utm_source', input.utmSource)
  setAttributionParam(url, 'utm_medium', input.utmMedium)
  setAttributionParam(url, 'utm_content', input.utmContent)
  setAttributionParam(url, 'utm_term', input.utmTerm)
  return `${url.pathname}${url.search}`
}

export function capturePublicAttribution(query: Record<string, unknown>): PublicAttributionFields | null {
  const fromQuery = attributionFromQuery(query)
  if (fromQuery) {
    writePublicAttribution(fromQuery)
    return fromQuery
  }
  return readStoredPublicAttribution()
}
