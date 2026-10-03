import { registrableDomain, normalizeEmailAddress, normalizeState } from './prospect'
import { addCalendarDays, denverDayStartUtc, denverYmd } from './time'

export const PROSPECT_DESK_SETTING_KEY = 'sales.prospect_desk'

export const EXCLUDED_OUTREACH_STATES = ['UT', 'ID', 'WY', 'CO', 'NM', 'AZ', 'NV'] as const

export const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const

export const OUTREACH_STATUSES = ['none', 'ready', 'queued', 'active', 'needs_you', 'bounced', 'stopped', 'paused'] as const
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

export const DESK_VIEWS = ['needs_you', 'ready', 'sending'] as const
export type DeskView = (typeof DESK_VIEWS)[number]

export type ProspectTemplate = {
  subject: string
  body: string
}

export type ProspectDeskConfig = {
  enabled: boolean
  practiceStates: string[]
  dailyCap: number
  sendStartHour: number
  sendEndHour: number
  minutesBetweenSends: number
  secondTouchDays: number
  thirdTouchDays: number
  bouncePauseLine: number
  fromName: string
  postalAddress: string
  unsubscribeLine: string
  templates: [ProspectTemplate, ProspectTemplate, ProspectTemplate]
  publicBaseUrl: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  imapHost: string
  imapPort: number
  mailboxUsername: string
  mailboxPassword: string
  senderPaused: boolean
  senderPausedReason: string | null
}

export type PublicProspectDeskConfig = Omit<ProspectDeskConfig, 'mailboxPassword'> & {
  passwordSet: boolean
}

const DEFAULT_TEMPLATES: [ProspectTemplate, ProspectTemplate, ProspectTemplate] = [
  {
    subject: 'A note for {{academy}}',
    body: 'Hello,\n\nI help martial arts academies keep track of intro classes and the follow-up after them. If that is useful for {{academy}} in {{city}}, I can show you how it works.\n\n{{address}}\n\n{{unsubscribe}}',
  },
  {
    subject: 'Re: {{academy}}',
    body: 'Hello,\n\nI wrote last week about intro follow-up for {{academy}}. I will not keep writing if this is not useful.\n\n{{address}}\n\n{{unsubscribe}}',
  },
  {
    subject: 'Last note for {{academy}}',
    body: 'Hello,\n\nThis is my last email about {{academy}}. If you want a look at the intro follow-up, reply to this note. Otherwise I will leave you alone.\n\n{{address}}\n\n{{unsubscribe}}',
  },
]

export function defaultPracticeStates() {
  return US_STATE_CODES.filter(code => !isExcludedOutreachState(code))
}

export function isExcludedOutreachState(value: string | null | undefined) {
  const state = normalizeState(value)
  return Boolean(state && (EXCLUDED_OUTREACH_STATES as readonly string[]).includes(state))
}

export function isUsStateCode(value: string) {
  return (US_STATE_CODES as readonly string[]).includes(value)
}

export function baseProspectDeskConfig(): ProspectDeskConfig {
  return {
    enabled: false,
    practiceStates: defaultPracticeStates(),
    dailyCap: 5,
    sendStartHour: 9,
    sendEndHour: 17,
    minutesBetweenSends: 15,
    secondTouchDays: 4,
    thirdTouchDays: 11,
    bouncePauseLine: 2,
    fromName: 'Nuxxion',
    postalAddress: '',
    unsubscribeLine: 'Reply stop and I will not email you again.',
    templates: DEFAULT_TEMPLATES.map(template => ({ ...template })) as ProspectDeskConfig['templates'],
    publicBaseUrl: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    imapHost: '',
    imapPort: 993,
    mailboxUsername: '',
    mailboxPassword: '',
    senderPaused: false,
    senderPausedReason: null,
  }
}

export function isLocalDogfoodDatabase(url: string) {
  const normalized = url.replaceAll('\\', '/').toLowerCase()
  return normalized.endsWith('/sales_template/data/app.sqlite')
    || normalized.endsWith('file:./data/app.sqlite')
    || normalized.endsWith('file:data/app.sqlite')
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    return fallback
  }
  return Math.min(max, Math.max(min, parsed))
}

function cleanTemplate(value: unknown, fallback: ProspectTemplate): ProspectTemplate {
  const source = value && typeof value === 'object' ? value as Partial<ProspectTemplate> : {}
  return {
    subject: String(source.subject ?? fallback.subject).trim().slice(0, 200) || fallback.subject,
    body: String(source.body ?? fallback.body).trim().slice(0, 4000) || fallback.body,
  }
}

export function normalizeProspectDeskConfig(
  input: unknown,
  defaults = baseProspectDeskConfig(),
): ProspectDeskConfig {
  const source = input && typeof input === 'object' ? input as Partial<ProspectDeskConfig> : {}
  const requestedStates = Array.isArray(source.practiceStates) ? source.practiceStates : defaults.practiceStates
  const practiceStates = [...new Set(requestedStates
    .map(state => normalizeState(String(state)) ?? '')
    .filter(state => state && isUsStateCode(state) && !isExcludedOutreachState(state)))]
  const templates = [0, 1, 2].map(index => cleanTemplate(source.templates?.[index], defaults.templates[index]!)) as ProspectDeskConfig['templates']
  const start = clampInt(source.sendStartHour, defaults.sendStartHour, 0, 23)
  let end = clampInt(source.sendEndHour, defaults.sendEndHour, 1, 24)
  if (end <= start) {
    end = Math.min(24, start + 1)
  }
  return {
    enabled: Boolean(source.enabled),
    practiceStates: practiceStates.length ? practiceStates : defaults.practiceStates,
    dailyCap: clampInt(source.dailyCap, defaults.dailyCap, 1, 50),
    sendStartHour: start,
    sendEndHour: end,
    minutesBetweenSends: clampInt(source.minutesBetweenSends, defaults.minutesBetweenSends, 1, 240),
    secondTouchDays: clampInt(source.secondTouchDays, defaults.secondTouchDays, 1, 30),
    thirdTouchDays: clampInt(source.thirdTouchDays, defaults.thirdTouchDays, 2, 60),
    bouncePauseLine: clampInt(source.bouncePauseLine, defaults.bouncePauseLine, 1, 20),
    fromName: String(source.fromName ?? defaults.fromName).trim().slice(0, 120) || defaults.fromName,
    postalAddress: String(source.postalAddress ?? '').trim().slice(0, 300),
    unsubscribeLine: String(source.unsubscribeLine ?? defaults.unsubscribeLine).trim().slice(0, 300) || defaults.unsubscribeLine,
    templates,
    publicBaseUrl: String(source.publicBaseUrl ?? '').trim().replace(/\/$/, '').slice(0, 300),
    smtpHost: String(source.smtpHost ?? '').trim().slice(0, 200),
    smtpPort: clampInt(source.smtpPort, defaults.smtpPort, 1, 65535),
    smtpSecure: Boolean(source.smtpSecure),
    imapHost: String(source.imapHost ?? '').trim().slice(0, 200),
    imapPort: clampInt(source.imapPort, defaults.imapPort, 1, 65535),
    mailboxUsername: String(source.mailboxUsername ?? '').trim().slice(0, 200),
    mailboxPassword: String(source.mailboxPassword ?? ''),
    senderPaused: Boolean(source.senderPaused),
    senderPausedReason: source.senderPausedReason ? String(source.senderPausedReason).slice(0, 300) : null,
  }
}

export function publicProspectDeskConfig(config: ProspectDeskConfig): PublicProspectDeskConfig {
  const { mailboxPassword, ...rest } = config
  return {
    ...rest,
    passwordSet: Boolean(mailboxPassword),
  }
}

export type QualificationInput = {
  name?: string | null
  city?: string | null
  state?: string | null
  website?: string | null
  email?: string | null
  emailSourceUrl?: string | null
}

export function qualificationFailure(input: QualificationInput) {
  if (!input.name?.trim()) {
    return 'missing_name'
  }
  const state = normalizeState(input.state)
  if (!state) {
    return 'missing_state'
  }
  if (isExcludedOutreachState(state)) {
    return 'excluded_state'
  }
  if (!input.city?.trim()) {
    return 'missing_city'
  }
  const domain = registrableDomain(input.website)
  if (!domain) {
    return 'missing_website'
  }
  const email = normalizeEmailAddress(input.email)
  if (!email) {
    return 'missing_email'
  }
  const emailHost = email.split('@')[1]?.replace(/^www\./, '') ?? ''
  const domainMatch = emailHost === domain || emailHost.endsWith(`.${domain}`)
  const foundOnSite = Boolean(input.emailSourceUrl?.trim())
  if (!domainMatch && !foundOnSite) {
    return 'email_not_on_site'
  }
  return null
}

export function renderProspectTemplate(template: string, values: {
  academy: string
  city: string
  address: string
  unsubscribe: string
}) {
  return template
    .replaceAll('{{academy}}', values.academy)
    .replaceAll('{{city}}', values.city)
    .replaceAll('{{address}}', values.address)
    .replaceAll('{{unsubscribe}}', values.unsubscribe)
}

export type ReplyClass = 'unsubscribe' | 'bounce' | 'out_of_office' | 'needs_you'

export function classifyProspectReply(subject: string, body: string): ReplyClass {
  const text = `${subject}\n${body}`.toLowerCase()
  if (/unsubscribe|remove me|do not (email|contact)|stop emailing|opt out/.test(text)) {
    return 'unsubscribe'
  }
  if (/mailer-daemon|delivery status notification|undeliverable|delivery has failed|address not found|user unknown/.test(text)) {
    return 'bounce'
  }
  if (/out of office|automatic reply|auto-reply|autoreply|away from the office/.test(text)) {
    return 'out_of_office'
  }
  return 'needs_you'
}

export function denverWeekdayAndHour(utcMs: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs))
  const weekday = parts.find(part => part.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? '0')
  return { weekday, hour }
}

export function withinSendWindow(config: ProspectDeskConfig, utcMs: number) {
  const { weekday, hour } = denverWeekdayAndHour(utcMs)
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false
  }
  return hour >= config.sendStartHour && hour < config.sendEndHour
}

export function touchDueAt(sequenceStartedAtMs: number, dayOffset: number) {
  return denverDayStartUtc(addCalendarDays(denverYmd(sequenceStartedAtMs), dayOffset))
}

export function mailboxReady(config: ProspectDeskConfig) {
  return Boolean(
    config.smtpHost
    && config.imapHost
    && config.mailboxUsername
    && config.mailboxPassword
    && config.postalAddress
    && config.unsubscribeLine
    && config.templates.every(template => template.subject && template.body),
  )
}

export function senderBlockReason(config: ProspectDeskConfig, utcMs: number, sentToday: number, lastSentAtMs: number | null) {
  if (!config.enabled) {
    return 'Prospects are turned off.'
  }
  if (config.senderPaused) {
    return config.senderPausedReason || 'Sending is paused.'
  }
  if (!mailboxReady(config)) {
    return 'Connect the mailbox and add the postal address before anything sends.'
  }
  if (!withinSendWindow(config, utcMs)) {
    return 'Outside the weekday send window.'
  }
  if (sentToday >= config.dailyCap) {
    return `Today's cap of ${config.dailyCap} is reached.`
  }
  if (lastSentAtMs != null && utcMs - lastSentAtMs < config.minutesBetweenSends * 60_000) {
    return 'Waiting for the gap between sends.'
  }
  return null
}

export function nextSequenceStep(input: {
  sentSteps: number[]
  sequenceStartedAtMs: number | null
  nowMs: number
  secondTouchDays: number
  thirdTouchDays: number
}) {
  if (!input.sentSteps.includes(1)) {
    return 1
  }
  if (!input.sequenceStartedAtMs) {
    return null
  }
  if (!input.sentSteps.includes(2) && input.nowMs >= touchDueAt(input.sequenceStartedAtMs, input.secondTouchDays)) {
    return 2
  }
  if (input.sentSteps.includes(2) && !input.sentSteps.includes(3) && input.nowMs >= touchDueAt(input.sequenceStartedAtMs, input.thirdTouchDays)) {
    return 3
  }
  return null
}
