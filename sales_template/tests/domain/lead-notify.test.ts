import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, toWebHandler } from 'h3'
import { setUseDbForTests } from '../../server/database'
import { listLeads } from '../../server/services/sales'
import { resetPublicRateLimit } from '../../server/utils/rate-limit'
import {
  DEFAULT_NOTIFY_FROM,
  buildLeadEmail,
  leadNotifyConfigFromEnv,
  notifyNewLead,
  type LeadNotifyConfig,
} from '../../server/services/lead-notify'
import { openTestDatabase } from '../helpers/db'

const API_KEY = 're_test_only_not_a_real_key'
const config: LeadNotifyConfig = {
  apiKey: API_KEY,
  from: DEFAULT_NOTIFY_FROM,
  to: ['owner@example.com'],
  origin: 'https://dev-example.nuxxion.com',
  appName: 'Example Hauling',
}
const lead = { id: 7, name: 'Pat Doe', email: 'pat@example.com', phone: '801-555-0100', message: 'Haul a couch\nand a fridge', source: 'website' }

function okFetch() {
  return vi.fn(async () => new Response(JSON.stringify({ id: 'email_1' }), { status: 200 }))
}

describe('lead notify config', () => {
  it('is off without a key or a recipient', () => {
    expect(leadNotifyConfigFromEnv({ NUXT_AUTH_EMAIL: 'a@example.com' })).toBeNull()
    expect(leadNotifyConfigFromEnv({ RESEND_API_KEY: API_KEY })).toBeNull()
    expect(leadNotifyConfigFromEnv({ RESEND_API_KEY: API_KEY, NUXT_AUTH_EMAIL: 'not-an-email' })).toBeNull()
  })

  it('defaults the sender and sends to the provisioning admin', () => {
    const c = leadNotifyConfigFromEnv({ RESEND_API_KEY: API_KEY, NUXT_AUTH_EMAIL: 'admin@example.com', NUXT_PUBLIC_ORIGIN: 'https://x.nuxxion.com/', NUXT_PUBLIC_BRAND_NAME: 'Top Tier' })
    expect(c).toMatchObject({ from: DEFAULT_NOTIFY_FROM, to: ['admin@example.com'], origin: 'https://x.nuxxion.com', appName: 'Top Tier' })
  })

  it('lets LEAD_NOTIFY_TO and NOTIFY_FROM override, and drops bad addresses', () => {
    const c = leadNotifyConfigFromEnv({ RESEND_API_KEY: API_KEY, NUXT_AUTH_EMAIL: 'admin@example.com', LEAD_NOTIFY_TO: 'a@example.com, nope, b@example.com', NOTIFY_FROM: 'Other <other@nuxxion.com>' })
    expect(c?.to).toEqual(['a@example.com', 'b@example.com'])
    expect(c?.from).toBe('Other <other@nuxxion.com>')
  })
})

describe('lead email', () => {
  it('carries the lead, a link to it, and replies go to the lead', () => {
    const mail = buildLeadEmail(lead, config)
    expect(mail.subject).toBe('New lead: Pat Doe')
    expect(mail.text).toContain('Email: pat@example.com')
    expect(mail.text).toContain('Haul a couch\nand a fridge')
    expect(mail.text).toContain('https://dev-example.nuxxion.com/leads/7')
    expect(mail.reply_to).toBe('pat@example.com')
  })

  it('keeps CR and LF out of the subject and single-line fields', () => {
    const mail = buildLeadEmail({ id: 1, name: 'Eve\r\nBcc: x@example.com', email: 'bad\r\n@x', phone: '1\n2' }, config)
    expect(mail.subject).not.toMatch(/[\r\n]/)
    expect(mail.text).toContain('Phone: 1 2')
    expect(mail).not.toHaveProperty('reply_to')
  })
})

describe('notifyNewLead', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('does nothing when not configured', async () => {
    const fetchImpl = okFetch()
    expect(await notifyNewLead(lead, { config: null, fetchImpl })).toEqual({ sent: false, reason: 'not_configured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('posts to Resend with the key as a bearer token', async () => {
    const fetchImpl = okFetch()
    expect(await notifyNewLead(lead, { config, fetchImpl })).toEqual({ sent: true })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${API_KEY}`)
    expect(JSON.parse(String(init.body))).toMatchObject({ from: DEFAULT_NOTIFY_FROM, to: ['owner@example.com'], subject: 'New lead: Pat Doe' })
  })

  it('reports a refusal without throwing and without logging the key', async () => {
    const fetchImpl = vi.fn(async () => new Response(`{"message":"bad key ${API_KEY}"}`, { status: 401 }))
    expect(await notifyNewLead(lead, { config, fetchImpl })).toEqual({ sent: false, reason: 'status_401' })
    const logged = errorSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('401')
    expect(logged).not.toContain(API_KEY)
  })

  it('gives up on a hanging request at the timeout', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
    }))
    expect(await notifyNewLead(lead, { config, fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 })).toEqual({ sent: false, reason: 'timeout' })
  })

  it('survives a network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('getaddrinfo ENOTFOUND api.resend.com')
    })
    expect(await notifyNewLead(lead, { config, fetchImpl })).toEqual({ sent: false, reason: 'error' })
  })
})

describe('keyed lead intake sends the new-lead email', () => {
  const INTAKE_KEY = 'test-only-intake-key-not-a-real-secret'
  let dbHandle: Awaited<ReturnType<typeof openTestDatabase>>
  let handle: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    dbHandle = await openTestDatabase()
    setUseDbForTests(dbHandle.db)
    process.env.LEAD_INTAKE_KEY = INTAKE_KEY
    process.env.RESEND_API_KEY = API_KEY
    process.env.LEAD_NOTIFY_TO = 'owner@example.com'
    const { default: handler } = await import('../../server/api/public/lead-intake.post')
    const app = createApp()
    app.use('/api/public/lead-intake', handler)
    const web = toWebHandler(app)
    handle = request => web(request)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    resetPublicRateLimit()
    delete process.env.LEAD_INTAKE_KEY
    delete process.env.RESEND_API_KEY
    delete process.env.LEAD_NOTIFY_TO
    setUseDbForTests(undefined)
    await dbHandle.close()
  })

  function post(body: unknown) {
    return handle(new Request('http://localhost/api/public/lead-intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-key': INTAKE_KEY },
      body: JSON.stringify(body),
    }))
  }

  it('saves the lead, then emails the admin about it', async () => {
    const fetchMock = okFetch()
    vi.stubGlobal('fetch', fetchMock)
    const res = await post({ name: 'Pat Doe', email: 'pat@example.com', message: 'Hello' })
    expect(res.status).toBe(200)
    const { id } = await res.json() as { id: number }
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(body.to).toEqual(['owner@example.com'])
    expect(body.text).toContain('Name: Pat Doe')
    expect((await listLeads(dbHandle.db, {})).some(row => row.id === id)).toBe(true)
  })

  it('still accepts the lead when the email fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 500 })))
    const res = await post({ name: 'Pat Doe', email: 'pat@example.com' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('does not wait for a hanging email before answering', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    const res = await post({ name: 'Pat Doe', phone: '801-555-0100' })
    expect(res.status).toBe(200)
  })
})
