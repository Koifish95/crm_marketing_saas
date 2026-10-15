import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
})

describe('original public intake endpoint is also key-protected', () => {
  const form = { firstName: 'Ann', lastName: 'Lee', email: 'ann@example.com', phone: '801-555-0111', message: 'hi' }
  let legacy: (request: Request) => Promise<Response>

  beforeEach(async () => {
    const { writePublicIntakeConfig } = await import('../../server/services/public-intake')
    await writePublicIntakeConfig(dbHandle.db, { enabled: true }, null)
    const { default: handler } = await import('../../server/api/public/intake.post')
    const app = createApp()
    app.use('/api/public/intake', handler)
    const web = toWebHandler(app)
    legacy = request => web(request)
    baseline = await leadCount()
  })

  function postLegacy(key?: string) {
    return legacy(new Request('http://localhost/api/public/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key === undefined ? {} : { 'x-intake-key': key }) },
      body: JSON.stringify(form),
    }))
  }

  it('creates the lead only with the correct key', async () => {
    expect((await postLegacy(KEY)).status).toBe(200)
    expect(await leadCount()).toBe(baseline + 1)
  })

  it('refuses missing key, wrong key and unset server key; creates nothing', async () => {
    expect((await postLegacy()).status).toBe(401)
    expect((await postLegacy('wrong')).status).toBe(401)
    delete process.env.LEAD_INTAKE_KEY
    expect((await postLegacy(KEY)).status).toBe(401)
    expect((await postLegacy('')).status).toBe(401)
    expect(await leadCount()).toBe(baseline)
  })
})
