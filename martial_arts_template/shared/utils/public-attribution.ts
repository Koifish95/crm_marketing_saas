export const PUBLIC_ATTRIBUTION_STORAGE_KEY = 'renzo-trial-attribution'

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

export function capturePublicAttribution(query: Record<string, unknown>): PublicAttributionFields | null {
  const fromQuery = attributionFromQuery(query)
  if (fromQuery) {
    writePublicAttribution(fromQuery)
    return fromQuery
  }
  return readStoredPublicAttribution()
}
