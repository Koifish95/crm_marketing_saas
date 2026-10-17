/**
 * Emails the environment's admin when a lead arrives from the website.
 *
 * Transactional only: one email per new lead, sent through the Resend API from the
 * Nuxxion notifications sender. It is off unless RESEND_API_KEY and a recipient are set,
 * it never throws, and it never logs the key. Prospect outreach does not use this sender.
 */

const RESEND_EMAILS_URL = 'https://api.resend.com/emails'
export const DEFAULT_NOTIFY_FROM = 'Nuxxion <notifications@nuxxion.com>'
const TIMEOUT_MS = 10_000
const MAX_FIELD = 4_000

export interface LeadNotifyConfig {
  apiKey: string
  from: string
  to: string[]
  origin: string | null
  appName: string
}

export interface NewLeadSummary {
  id: number
  name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  source?: string | null
}

export interface LeadNotifyResult {
  sent: boolean
  reason?: string
}

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/

function isEmail(value: string) {
  return EMAIL.test(value)
}

/** Control characters (including CR and LF) are removed from single-line values. */
function oneLine(value: string | null | undefined, max = 200) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max)
}

function multiLine(value: string | null | undefined) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_FIELD)
}

/** Null when the sender or the recipient is missing: then nothing is sent. */
export function leadNotifyConfigFromEnv(env: NodeJS.ProcessEnv = process.env): LeadNotifyConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim()
  const to = (env.LEAD_NOTIFY_TO?.trim() || env.NUXT_AUTH_EMAIL?.trim() || '')
    .split(',')
    .map(address => address.trim())
    .filter(isEmail)
  if (!apiKey || !to.length) {
    return null
  }
  const origin = env.NUXT_PUBLIC_ORIGIN?.trim().replace(/\/+$/, '') || null
  return {
    apiKey,
    from: env.NOTIFY_FROM?.trim() || DEFAULT_NOTIFY_FROM,
    to,
    origin: origin && /^https?:\/\//.test(origin) ? origin : null,
    appName: oneLine(env.NUXT_PUBLIC_BRAND_NAME || env.NUXT_PUBLIC_APP_NAME || 'Nuxxion Sales', 120),
  }
}

export function buildLeadEmail(lead: NewLeadSummary, config: LeadNotifyConfig) {
  const name = oneLine(lead.name) || 'Someone'
  const email = oneLine(lead.email)
  const lines = [
    `A new lead came in for ${config.appName}.`,
    '',
    `Name: ${name}`,
    `Email: ${email || '(none)'}`,
    `Phone: ${oneLine(lead.phone) || '(none)'}`,
    `Source: ${oneLine(lead.source) || 'website'}`,
  ]
  const message = multiLine(lead.message)
  if (message) {
    lines.push('', 'Message:', message)
  }
  if (config.origin) {
    lines.push('', `Open the lead: ${config.origin}/leads/${lead.id}`)
  }
  lines.push('', 'You get this email because you are the admin of this Nuxxion Sales account.')
  return {
    from: config.from,
    to: config.to,
    subject: `New lead: ${name}`,
    text: lines.join('\n'),
    ...(email && isEmail(email) ? { reply_to: email } : {}),
  }
}

function redact(text: string, apiKey: string) {
  return apiKey ? text.split(apiKey).join('[redacted]') : text
}

/** Sends the new-lead email. Never throws; the result says whether Resend accepted it. */
export async function notifyNewLead(
  lead: NewLeadSummary,
  options: { config?: LeadNotifyConfig | null, fetchImpl?: typeof fetch, timeoutMs?: number } = {},
): Promise<LeadNotifyResult> {
  const config = options.config === undefined ? leadNotifyConfigFromEnv() : options.config
  if (!config) {
    return { sent: false, reason: 'not_configured' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS)
  try {
    const response = await (options.fetchImpl ?? fetch)(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildLeadEmail(lead, config)),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = redact((await response.text().catch(() => '')).slice(0, 300), config.apiKey)
      console.error(`[lead-notify] lead ${lead.id} not sent: Resend returned ${response.status} ${detail}`)
      return { sent: false, reason: `status_${response.status}` }
    }
    console.info(`[lead-notify] lead ${lead.id} emailed to the admin`)
    return { sent: true }
  } catch (error) {
    const reason = controller.signal.aborted ? 'timeout' : 'error'
    const detail = error instanceof Error ? redact(error.message, config.apiKey) : 'unknown error'
    console.error(`[lead-notify] lead ${lead.id} not sent (${reason}): ${detail}`)
    return { sent: false, reason }
  } finally {
    clearTimeout(timer)
  }
}
