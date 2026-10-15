import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, toWebHandler } from 'h3'
import { setUseDbForTests } from '../../server/database'
import { listLeads } from '../../server/services/sales'
import { writePublicIntakeConfig } from '../../server/services/public-intake'
import { resetPublicRateLimit } from '../../server/utils/rate-limit'
import { openTestDatabase } from '../helpers/db'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>>
let handle: (request: Request) => Promise<Response>

beforeEach(async () => {
  dbHandle = await openTestDatabase()
  setUseDbForTests(dbHandle.db)
  process.env.LEAD_INTAKE_KEY = 'test-only-intake-key-not-a-real-secret'
  await writePublicIntakeConfig(dbHandle.db, { enabled: true }, null)
  const { default: handler } = await import('../../server/api/public/intake.post')
  const app = createApp()
  app.use('/api/public/intake', handler)
  const web = toWebHandler(app)
  handle = request => web(request)
})

afterEach(async () => {
  resetPublicRateLimit()
  delete process.env.LEAD_INTAKE_KEY
  setUseDbForTests(undefined)
  await dbHandle.close()
})

describe('browser inquiry form endpoint is not gated by the server-to-server key', () => {
  for (const keyConfigured of [true, false]) {
    it(`accepts a browser submission without X-Intake-Key (server key ${keyConfigured ? 'set' : 'unset'})`, async () => {
      if (!keyConfigured) {
        delete process.env.LEAD_INTAKE_KEY
      }
      const before = (await listLeads(dbHandle.db)).length
      const response = await handle(new Request('http://localhost/api/public/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }),
      }))
      expect(response.status).toBe(200)
      expect((await listLeads(dbHandle.db)).length).toBe(before + 1)
    })
  }

  it('the shared browser form component only posts to the browser endpoint, never sends a secret', () => {
    const source = readFileSync(new URL('../../app/components/PublicIntakeForm.vue', import.meta.url), 'utf8')
    expect(source).not.toContain('lead-intake')
    expect(source.toLowerCase()).not.toContain('x-intake-key')
  })
})
