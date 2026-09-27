export const PROSPECT_STATUSES = ['new', 'review', 'promoted', 'skipped', 'do_not_contact'] as const
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: 'New',
  review: 'Review',
  promoted: 'Promoted',
  skipped: 'Skipped',
  do_not_contact: 'Do not contact',
}

export const PROSPECT_PRIORITIES = ['normal', 'high'] as const
export type ProspectPriority = (typeof PROSPECT_PRIORITIES)[number]

export const PROSPECT_PRIORITY_LABELS: Record<ProspectPriority, string> = {
  normal: 'Normal',
  high: 'High',
}

export const PROSPECT_LANES = ['national', 'local'] as const
export type ProspectLane = (typeof PROSPECT_LANES)[number]

export const PROSPECT_LANE_LABELS: Record<ProspectLane, string> = {
  national: 'National',
  local: 'Local',
}

export const PROSPECT_PROMOTABLE_STATUSES: readonly ProspectStatus[] = ['new', 'review', 'skipped']

const LEGAL_TOKENS = new Set([
  'llc',
  'inc',
  'incorporated',
  'ltd',
  'limited',
  'pllc',
  'pc',
  'corp',
  'corporation',
  'co',
  'company',
])

const MULTI_PART_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'com.br',
  'co.jp',
  'com.mx',
])

const SHARED_SITE_SUFFIXES = [
  'wixsite.com',
  'square.site',
  'business.site',
  'godaddysites.com',
  'myshopify.com',
  'carrd.co',
  'webflow.io',
]

const IGNORED_REGISTRABLE_DOMAINS = new Set([
  'facebook.com',
  'fb.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'tiktok.com',
  'yelp.com',
  'google.com',
  'goo.gl',
  'g.page',
])

const STATE_BY_NAME: Record<string, string> = {
  'al': 'AL',
  'alabama': 'AL',
  'ak': 'AK',
  'alaska': 'AK',
  'az': 'AZ',
  'arizona': 'AZ',
  'ar': 'AR',
  'arkansas': 'AR',
  'ca': 'CA',
  'california': 'CA',
  'co': 'CO',
  'colorado': 'CO',
  'ct': 'CT',
  'connecticut': 'CT',
  'de': 'DE',
  'delaware': 'DE',
  'dc': 'DC',
  'district of columbia': 'DC',
  'fl': 'FL',
  'florida': 'FL',
  'ga': 'GA',
  'georgia': 'GA',
  'hi': 'HI',
  'hawaii': 'HI',
  'id': 'ID',
  'idaho': 'ID',
  'il': 'IL',
  'illinois': 'IL',
  'in': 'IN',
  'indiana': 'IN',
  'ia': 'IA',
  'iowa': 'IA',
  'ks': 'KS',
  'kansas': 'KS',
  'ky': 'KY',
  'kentucky': 'KY',
  'la': 'LA',
  'louisiana': 'LA',
  'me': 'ME',
  'maine': 'ME',
  'md': 'MD',
  'maryland': 'MD',
  'ma': 'MA',
  'massachusetts': 'MA',
  'mi': 'MI',
  'michigan': 'MI',
  'mn': 'MN',
  'minnesota': 'MN',
  'ms': 'MS',
  'mississippi': 'MS',
  'mo': 'MO',
  'missouri': 'MO',
  'mt': 'MT',
  'montana': 'MT',
  'ne': 'NE',
  'nebraska': 'NE',
  'nv': 'NV',
  'nevada': 'NV',
  'nh': 'NH',
  'new hampshire': 'NH',
  'nj': 'NJ',
  'new jersey': 'NJ',
  'nm': 'NM',
  'new mexico': 'NM',
  'ny': 'NY',
  'new york': 'NY',
  'nc': 'NC',
  'north carolina': 'NC',
  'nd': 'ND',
  'north dakota': 'ND',
  'oh': 'OH',
  'ohio': 'OH',
  'ok': 'OK',
  'oklahoma': 'OK',
  'or': 'OR',
  'oregon': 'OR',
  'pa': 'PA',
  'pennsylvania': 'PA',
  'ri': 'RI',
  'rhode island': 'RI',
  'sc': 'SC',
  'south carolina': 'SC',
  'sd': 'SD',
  'south dakota': 'SD',
  'tn': 'TN',
  'tennessee': 'TN',
  'tx': 'TX',
  'texas': 'TX',
  'ut': 'UT',
  'utah': 'UT',
  'vt': 'VT',
  'vermont': 'VT',
  'va': 'VA',
  'virginia': 'VA',
  'wa': 'WA',
  'washington': 'WA',
  'wv': 'WV',
  'west virginia': 'WV',
  'wi': 'WI',
  'wisconsin': 'WI',
  'wy': 'WY',
  'wyoming': 'WY',
}

export function isProspectStatus(value: string): value is ProspectStatus {
  return (PROSPECT_STATUSES as readonly string[]).includes(value)
}

export function prospectStatusLabel(status: string) {
  return isProspectStatus(status) ? PROSPECT_STATUS_LABELS[status] : status
}

export function isProspectPriority(value: string): value is ProspectPriority {
  return (PROSPECT_PRIORITIES as readonly string[]).includes(value)
}

export function prospectPriorityLabel(priority: string) {
  return isProspectPriority(priority) ? PROSPECT_PRIORITY_LABELS[priority] : priority
}

export function isProspectLane(value: string): value is ProspectLane {
  return (PROSPECT_LANES as readonly string[]).includes(value)
}

export function prospectLaneLabel(lane: string) {
  return isProspectLane(lane) ? PROSPECT_LANE_LABELS[lane] : lane
}

export function canPromoteProspectStatus(status: string) {
  return (PROSPECT_PROMOTABLE_STATUSES as readonly string[]).includes(status)
}

export function normalizeBusinessName(name: string) {
  const tokens = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => !LEGAL_TOKENS.has(token))
  if (tokens[0] === 'the') {
    tokens.shift()
  }
  if (tokens.length > 1 && tokens[tokens.length - 1] === 'academy') {
    tokens.pop()
  }
  return tokens.join(' ')
}

export function normalizePlace(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  return trimmed || null
}

export function normalizeState(value: string | null | undefined) {
  const place = normalizePlace(value)
  if (!place) {
    return null
  }
  return STATE_BY_NAME[place] ?? null
}

export function normalizePhoneKey(value: string | null | undefined) {
  const digits = value?.replace(/\D+/g, '') ?? ''
  if (!digits) {
    return null
  }
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return national.length >= 10 ? national.slice(-10) : null
}

export function normalizeEmailAddress(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) {
    return null
  }
  return trimmed
}

function hostnameOf(website: string) {
  const trimmed = website.trim()
  if (!trimmed) {
    return null
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return null
  }
}

export function registrableDomain(website: string | null | undefined) {
  if (!website) {
    return null
  }
  const host = hostnameOf(website)
  if (!host) {
    return null
  }
  const bare = host.replace(/^www\./, '')
  for (const suffix of SHARED_SITE_SUFFIXES) {
    if (bare === suffix) {
      return null
    }
    if (bare.endsWith(`.${suffix}`)) {
      return bare
    }
  }
  const labels = bare.split('.').filter(Boolean)
  if (labels.length < 2) {
    return null
  }
  const lastTwo = labels.slice(-2).join('.')
  if (MULTI_PART_SUFFIXES.has(lastTwo) && labels.length >= 3) {
    const lastThree = labels.slice(-3).join('.')
    return IGNORED_REGISTRABLE_DOMAINS.has(lastThree) ? null : lastThree
  }
  return IGNORED_REGISTRABLE_DOMAINS.has(lastTwo) ? null : lastTwo
}

export function locationIdentityKey(name: string, city: string | null | undefined, state: string | null | undefined) {
  const normalizedName = normalizeBusinessName(name)
  const normalizedCity = normalizePlace(city)
  const normalizedState = normalizeState(state)
  if (!normalizedName || !normalizedCity || !normalizedState) {
    return null
  }
  return `${normalizedName}|${normalizedCity}|${normalizedState}`
}

export function nameStateKey(name: string, state: string | null | undefined) {
  const normalizedName = normalizeBusinessName(name)
  const normalizedState = normalizeState(state)
  if (!normalizedName || !normalizedState) {
    return null
  }
  return `${normalizedName}|${normalizedState}`
}

export function arrivalStatus(input: { domainKey: string | null, locationKey: string | null }) {
  return input.domainKey || input.locationKey ? 'review' : 'new'
}

export function prospectReadiness(input: { status: string, email: string | null, phone: string | null }) {
  if (input.status === 'do_not_contact') {
    return 'Do not contact'
  }
  if (input.status === 'promoted') {
    return 'In Sales'
  }
  if (input.email || input.phone) {
    return 'Contactable'
  }
  return 'Needs enrichment'
}
