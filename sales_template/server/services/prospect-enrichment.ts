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
  const email = value.trim().toLowerCase().replace(/^mailto:/, '')
  if (!email.includes('@') || email.endsWith('.png') || email.endsWith('.jpg') || email.endsWith('.webp') || email.endsWith('.svg')) {
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

export function extractPublicContacts(html: string) {
  const emails = new Set<string>()
  const phones = new Set<string>()
  for (const match of html.matchAll(MAILTO_PATTERN)) {
    const email = cleanEmail(match[1] ?? '')
    if (email) {
      emails.add(email)
    }
  }
  for (const match of html.matchAll(EMAIL_PATTERN)) {
    const email = cleanEmail(match[0] ?? '')
    if (email) {
      emails.add(email)
    }
  }
  for (const match of html.matchAll(TEL_PATTERN)) {
    const phone = cleanPhone(match[1] ?? '')
    if (phone) {
      phones.add(phone)
    }
  }
  return {
    emails: [...emails],
    phones: [...phones],
  }
}

export function pageMentionsAcademy(html: string, academyName: string) {
  const text = html.toLowerCase()
  const tokens = academyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !['martial', 'arts', 'academy', 'dojo', 'center', 'centre', 'studio', 'studios'].includes(token))
  if (!tokens.length) {
    return true
  }
  return tokens.some(token => text.includes(token))
}
