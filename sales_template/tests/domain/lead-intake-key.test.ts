import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, toWebHandler } from 'h3'
import { setUseDbForTests } from '../../server/database'
import { listLeads } from '../../server/services/sales'
import { salesNotes } from '../../server/database/schema'
import { resetPublicRateLimit } from '../../server/utils/rate-limit'
import { openTestDatabase } from '../helpers/db'

const KEY = 'test-only-intake-key-not-a-real-secret'
let dbHandle: Awaited<ReturnType<typeof openTestDatabase>>
let baseline = 0
let handle: (request: Request) => Promise<Response>

beforeEach(async () => {
  dbHandle = await openTestDatabase()
  setUseDbForTests(dbHandle.db)
  process.env.LEAD_INTAKE_KEY = KEY
  const { default: handler } = await import('../../server/api/public/lead-intake.post')
  const app = createApp()
  app.use('/api/public/lead-intake', handler)
  const web = toWebHandler(app)
  handle = request => web(request)
  baseline = await leadCount()
})

afterEach(async () => {
  resetPublicRateLimit()
  delete process.env.LEAD_INTAKE_KEY
  setUseDbForTests(undefined)
  await dbHandle.close()
})

function post(body: unknown, key?: string) {
  return handle(new Request('http://localhost/api/public/lead-intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key === undefined ? {} : { 'x-intake-key': key }) },
    body: JSON.stringify(body),
  }))
}

const lead = { name: 'Pat Doe', email: 'pat@example.com', phone: '801-555-0100', message: 'Hello there', source: 'website' }

async function leadCount() {
  return (await listLeads(dbHandle.db, {})).length
}

describe('keyed public lead intake', () => {
  it('does not throttle a burst of valid keyed leads from one IP', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await post({ ...lead, name: `Burst ${i}`, email: `burst${i}@example.com` }, KEY)
      expect(res.status).toBe(200)
    }
    expect(await leadCount()).toBe(baseline + 20)
  })

  it('does not count wrong-key requests toward the limit, and a 429 carries Retry-After', async () => {
    for (let i = 0; i < 400; i++) expect((await post(lead, 'wrong')).status).toBe(401)
    let last: Response | undefined
    for (let i = 0; i < 301; i++) last = await post({}, KEY)
    expect(last!.status).toBe(429)
    expect(last!.headers.get('retry-after')).toBe('600')
  })

  it('creates the lead with the correct key and maps every field', async () => {
    const res = await post(lead, KEY)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    expect(await leadCount()).toBe(baseline + 1)
    const created = (await listLeads(dbHandle.db, { search: 'Pat Doe' }))[0]
    expect(created).toMatchObject({
      displayName: 'Pat Doe',
      email: 'pat@example.com',
      phone: '801-555-0100',
      sourceName: 'Website / Organic',
      sourceDetail: 'website',
      stage: 'new',
    })
    const notes = await dbHandle.db.select().from(salesNotes)
    expect(notes.some(n => n.recordId === created!.id && n.body.includes('Hello there'))).toBe(true)
  })

  it('tolerates missing optional fields', async () => {
    const res = await post({ name: 'Only Phone', phone: '555-0101' }, KEY)
    expect(res.status).toBe(200)
    const created = (await listLeads(dbHandle.db, { search: 'Only Phone' }))[0]
    expect(created).toMatchObject({ displayName: 'Only Phone', sourceDetail: 'website' })
  })

  it('refuses a missing key and creates nothing', async () => {
    const res = await post(lead)
    expect(res.status).toBe(401)
    expect(await leadCount()).toBe(baseline)
  })

  it('refuses a wrong key and creates nothing', async () => {
    for (const wrong of ['nope', KEY + 'x', KEY.slice(0, -1), '']) {
      expect((await post(lead, wrong)).status).toBe(401)
    }
    expect(await leadCount()).toBe(baseline)
  })

  it('fails closed when the server key is unset or blank', async () => {
    delete process.env.LEAD_INTAKE_KEY
    expect((await post(lead, KEY)).status).toBe(401)
    expect((await post(lead, '')).status).toBe(401)
    process.env.LEAD_INTAKE_KEY = '   '
    expect((await post(lead, '   ')).status).toBe(401)
    expect(await leadCount()).toBe(baseline)
  })

  it('rejects an authorized lead with no name or no way to reach them', async () => {
    expect((await post({ email: 'a@example.com' }, KEY)).status).toBe(400)
    expect((await post({ name: 'No Contact' }, KEY)).status).toBeGreaterThanOrEqual(400)
    expect(await leadCount()).toBe(baseline)
  })

  it('replays a retry with the same Idempotency-Key and payload without a second lead', async () => {
    const send = (body: unknown, idem: string) => handle(new Request('http://localhost/api/public/lead-intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-key': KEY, 'idempotency-key': idem },
      body: JSON.stringify(body),
    }))
    const first = await (await send(lead, 'retry-1')).json()
    const second = await send(lead, 'retry-1')
    expect(second.status).toBe(200)
    expect((await second.json()).id).toBe(first.id)
    expect(await leadCount()).toBe(baseline + 1)
    const notes = await dbHandle.db.select().from(salesNotes)
    expect(notes.filter(n => n.recordId === first.id && n.body.includes('Hello there'))).toHaveLength(1)
  })

  it('rejects an Idempotency-Key reused with a different payload and bad keys', async () => {
    const send = (body: unknown, idem: string) => handle(new Request('http://localhost/api/public/lead-intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-key': KEY, 'idempotency-key': idem },
      body: JSON.stringify(body),
    }))
    expect((await send(lead, 'reuse-1')).status).toBe(200)
    expect((await send({ ...lead, phone: '801-555-0199' }, 'reuse-1')).status).toBe(400)
    expect((await send(lead, 'bad key!')).status).toBe(400)
    expect(await leadCount()).toBe(baseline + 1)
  })

  it('treats keys that differ only by a LIKE wildcard as distinct', async () => {
    const send = (body: unknown, idem: string) => handle(new Request('http://localhost/api/public/lead-intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-key': KEY, 'idempotency-key': idem },
      body: JSON.stringify(body),
    }))
    expect((await send(lead, 'abcXdef')).status).toBe(200)
    expect((await send({ ...lead, phone: '801-555-0199' }, 'abc_def')).status).toBe(200)
    expect(await leadCount()).toBe(baseline + 2)
  })

  it('replays one lead for concurrent identical keyed requests', async () => {
    const send = () => handle(new Request('http://localhost/api/public/lead-intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-key': KEY, 'idempotency-key': 'race-1' },
      body: JSON.stringify(lead),
    }))
    const responses = await Promise.all([send(), send(), send()])
    expect(responses.map(r => r.status)).toEqual([200, 200, 200])
    const ids = await Promise.all(responses.map(async r => (await r.json()).id))
    expect(new Set(ids).size).toBe(1)
    expect(await leadCount()).toBe(baseline + 1)
  })

  it('accepts percent-sign keys as distinct keys', async () => {
    const send = (body: unknown, idem: string) => handle(new Request('http://localhost/api/public/lead-intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-intake-key': KEY, 'idempotency-key': idem },
      body: JSON.stringify(body),
    }))
    expect((await send(lead, 'abc%def')).status).toBe(200)
    expect((await send({ ...lead, phone: '801-555-0199' }, 'abcXdef')).status).toBe(200)
    expect((await send({ ...lead, phone: '801-555-0188' }, 'abc%')).status).toBe(200)
    expect(await leadCount()).toBe(baseline + 3)
  })

  it('records the notification outcome as a note on the saved lead', async () => {
    const res = await post(lead, KEY)
    const { id } = await res.json()
    await vi.waitFor(async () => {
      const notes = await dbHandle.db.select().from(salesNotes)
      expect(notes.some(n => n.recordId === id && n.body.startsWith('Email notification: not sent'))).toBe(true)
    })
  })
})
