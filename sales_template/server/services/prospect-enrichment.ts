import { normalizeEmailAddress, registrableDomain } from '../../shared/utils/prospect'
import { isFreeMailAddress, type EmailEvidence } from '../../shared/utils/prospect-desk'

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const MAILTO_PATTERN = /mailto:([^"'?\s>]+)/gi
const TEL_PATTERN = /tel:([^"'?\s>]+)/gi

const IGNORED_EMAIL_HOSTS = [
  'example.com',
  'sentry.io',
  'wixpress.com',
  'wix.com',
  'godaddy.com',
  'schema.org',
  'cloudflare.com',
]

export function robotsAllowsHomepage(robotsText: string) {
  let applies = false
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.split('#')[0]?.trim() ?? ''
    if (!line) {
      continue
    }
    const separator = line.indexOf(':')
    if (separator < 1) {
      continue
    }
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (key === 'user-agent') {
      applies = value === '*'
      continue
    }
    if (applies && key === 'disallow' && value === '/') {
      return false
    }
  }
  return true
}

function cleanEmail(value: string) {
  const email = normalizeEmailAddress(value)
  if (!email || email.endsWith('.png') || email.endsWith('.jpg') || email.endsWith('.webp') || email.endsWith('.svg')) {
    return null
  }
  const host = email.split('@')[1] ?? ''
  if (IGNORED_EMAIL_HOSTS.some(ignored => host === ignored || host.endsWith(`.${ignored}`))) {
    return null
  }
  if (email.startsWith('noreply@') || email.startsWith('no-reply@')) {
    return null
  }
  return email
}

function cleanPhone(value: string) {
  const decoded = decodeURIComponent(value).trim()
  const digits = decoded.replace(/\D+/g, '')
  if (digits.length < 10) {
    return null
  }
  return decoded
}

const NAME_WINDOW = 300

export function academyNameTokens(academyName: string) {
  return academyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !['martial', 'arts', 'academy', 'dojo', 'center', 'centre', 'studio', 'studios'].includes(token))
}

export type FoundEmail = { address: string, evidence: EmailEvidence }

export function extractPublicContacts(html: string, academyName = '') {
  const found = new Map<string, EmailEvidence>()
  const phones = new Set<string>()
  const tokens = academyNameTokens(academyName)
  const lower = html.toLowerCase()
  for (const match of html.matchAll(MAILTO_PATTERN)) {
    const email = cleanEmail(match[1] ?? '')
    if (email) {
      found.set(email, 'mailto')
    }
  }
  for (const match of html.matchAll(EMAIL_PATTERN)) {
    const at = match.index ?? 0
    // A match glued to another "@" is a malformed address, not a clean one.
    if (html[at - 1] === '@' || html[at + match[0].length] === '@') {
      continue
    }
    const email = cleanEmail(match[0] ?? '')
    if (!email || found.get(email) === 'mailto') {
      continue
    }
    const around = lower.slice(Math.max(0, at - NAME_WINDOW), at + match[0].length + NAME_WINDOW)
    const near = tokens.some(token => around.includes(token))
    if (near || !found.has(email)) {
      found.set(email, near ? 'near_name' : 'page')
    }
  }
  for (const match of html.matchAll(TEL_PATTERN)) {
    const phone = cleanPhone(match[1] ?? '')
    if (phone) {
      phones.add(phone)
    }
  }
  const candidates: FoundEmail[] = [...found].map(([address, evidence]) => ({ address, evidence }))
  return {
    emails: candidates.map(candidate => candidate.address),
    candidates,
    phones: [...phones],
  }
}

// Best address for a site: its own domain first, then a free-mail address with real
// evidence, then another business's address, then a free-mail address with none.
export function chooseSiteEmail(candidates: FoundEmail[], website: string) {
  const domain = registrableDomain(website)
  const rank = (candidate: FoundEmail) => {
    const host = candidate.address.split('@')[1] ?? ''
    if (domain && (host === domain || host.endsWith(`.${domain}`))) {
      return 0
    }
    if (isFreeMailAddress(candidate.address)) {
      return candidate.evidence === 'mailto' || candidate.evidence === 'near_name' ? 1 : 3
    }
    return 2
  }
  return [...candidates].sort((left, right) => rank(left) - rank(right))[0] ?? null
}

export function pageMentionsAcademy(html: string, academyName: string) {
  const text = html.toLowerCase()
  const tokens = academyNameTokens(academyName)
  if (!tokens.length) {
    return true
  }
  return tokens.some(token => text.includes(token))
}
