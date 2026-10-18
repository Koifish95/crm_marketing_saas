import { afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { salesProspectLookups, salesProspects } from '../../server/database/schema'
import { extractPublicContacts } from '../../server/services/prospect-enrichment'
import { listDeskProspects, prospectDeskSummary } from '../../server/services/prospect-outreach'
import { fetchOverpass, ingestDiscoveryElements, LOOKUPS_PER_RUN } from '../../server/services/prospect-runs'
import { createManualProspect, requalifyStoredProspects } from '../../server/services/prospects'
import { normalizeEmailAddress } from '../../shared/utils/prospect'
import { qualificationFailure } from '../../shared/utils/prospect-desk'
import { openTestDatabase } from '../helpers/db'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
})

function element(id: number, tags: Record<string, string>) {
  return { type: 'node', id, tags: { 'addr:city': 'Columbus', ...tags } }
}

function pages(map: Record<string, string>, calls: string[] = []) {
  return (async (input: URL | string) => {
    const url = new URL(String(input))
    if (url.pathname === '/robots.txt') {
      return new Response('', { status: 404 })
    }
    calls.push(url.hostname)
    const html = map[url.hostname]
    return html == null ? new Response('', { status: 500 }) : new Response(html)
  }) as typeof fetch
}

describe('email cleaning', () => {
  it('strips trailing slash, quote, bracket and period scraps', () => {
    expect(normalizeEmailAddress('blackwidowmmatx@gmail.com\\')).toBe('blackwidowmmatx@gmail.com')
    expect(normalizeEmailAddress('mailto:x@y.com"')).toBe('x@y.com')
    expect(normalizeEmailAddress('x@y.com.')).toBe('x@y.com')
    expect(normalizeEmailAddress('(x@y.com),')).toBe('x@y.com')
  })

  it('rejects anything that is not a single plain address', () => {
    expect(normalizeEmailAddress('a@b.com;c@d.com')).toBeNull()
    expect(normalizeEmailAddress('a@b.com, c@d.com')).toBeNull()
    expect(normalizeEmailAddress('Call us @ noon')).toBeNull()
    expect(normalizeEmailAddress('a@b')).toBeNull()
  })

  it('cleans addresses found in mailto links and page text', () => {
    const contacts = extractPublicContacts('<a href="mailto:x@y.com&quot;">a</a> write blackwidowmmatx@gmail.com\\ or z@y.com.')
    expect(contacts.emails).toContain('x@y.com')
    expect(contacts.emails).toContain('blackwidowmmatx@gmail.com')
    expect(contacts.emails).toContain('z@y.com')
  })
})

describe('email domain rules', () => {
  const base = { name: 'Gym', city: 'Columbus', state: 'OH', website: 'https://gym.example' }

  it('accepts an address on the gym domain', () => {
    expect(qualificationFailure({ ...base, email: 'info@gym.example' })).toBeNull()
  })

  it('no longer lets found-on-site skip the domain check', () => {
    expect(qualificationFailure({ ...base, email: 'matt@pixelspread.com', emailSourceUrl: 'https://gym.example/' })).toBe('third_party_email')
  })

  it('accepts free-mail only from a mailto link or near the gym name', () => {
    const email = 'impallari@gmail.com'
    expect(qualificationFailure({ ...base, email, emailSourceUrl: 'https://gym.example/' })).toBe('email_not_on_site')
    expect(qualificationFailure({ ...base, email, emailEvidence: 'page' })).toBe('email_not_on_site')
    expect(qualificationFailure({ ...base, email, emailEvidence: 'mailto' })).toBeNull()
    expect(qualificationFailure({ ...base, email, emailEvidence: 'near_name' })).toBeNull()
  })

  it('marks free-mail near the name versus far from it', () => {
    const near = extractPublicContacts('<h1>Black Widow MMA</h1><p>Email blackwidowmmatx@gmail.com</p>', 'Black Widow MMA')
    expect(near.candidates[0]?.evidence).toBe('near_name')
    const far = extractPublicContacts(`<p>x@gmail.com</p>${'<p>filler text</p>'.repeat(60)}<h1>Black Widow MMA</h1>`, 'Black Widow MMA')
    expect(far.candidates[0]?.evidence).toBe('page')
  })
})

describe('discovery stores rejected candidates with a reason', () => {
  it('keeps third-party and unproven free-mail addresses rejected with address and source', async () => {
    dbHandle = await openTestDatabase()
    const elements = [
      element(1, { name: 'Good Dojo', website: 'https://good.example', email: 'sensei@good.example' }),
      element(2, { name: 'Pixel Karate', website: 'https://pixel.example' }),
      element(3, { name: 'Widow Jiu Jitsu', website: 'https://widow.example' }),
      element(4, { 'name': 'Nocity Karate', 'website': 'https://nocity.example', 'addr:city': '' }),
      element(5, { name: 'Nosite Karate' }),
      element(6, { name: 'Blocked Karate', website: 'https://blocked.example' }),
      element(7, { name: 'Broken Karate', website: 'https://broken.example' }),
    ]
    const fetchImpl = (async (input: URL | string) => {
      const url = new URL(String(input))
      if (url.hostname === 'blocked.example' && url.pathname === '/robots.txt') {
        return new Response('User-agent: *\nDisallow: /')
      }
      if (url.pathname === '/robots.txt') {
        return new Response('', { status: 404 })
      }
      if (url.hostname === 'pixel.example') {
        return new Response('<h1>Pixel Karate</h1><a href="mailto:matt@pixelspread.com">web</a>')
      }
      if (url.hostname === 'widow.example') {
        return new Response('<p>contact: impallari@gmail.com</p>' + '<p>pad</p>'.repeat(80) + '<h1>Widow Jiu Jitsu</h1>')
      }
      return new Response('', { status: 500 })
    }) as typeof fetch
    const result = await ingestDiscoveryElements(dbHandle.db, 'OH', elements, fetchImpl)
    expect(result.detail).toBe('All sites looked up')
    const rows = await dbHandle.db.select().from(salesProspects)
    const byName = (name: string) => rows.find(row => row.name === name)!
    expect(byName('Good Dojo').outreachStatus).toBe('awaiting_approval')
    expect(byName('Pixel Karate')).toMatchObject({
      outreachStatus: 'rejected',
      rejectionReason: 'third_party_email',
      email: 'matt@pixelspread.com',
      emailSourceUrl: 'https://pixel.example/',
    })
    expect(byName('Widow Jiu Jitsu')).toMatchObject({ outreachStatus: 'rejected', rejectionReason: 'email_not_on_site', email: 'impallari@gmail.com' })
    expect(byName('Nocity Karate').rejectionReason).toBe('missing_city')
    expect(byName('Nosite Karate').rejectionReason).toBe('missing_website')
    expect(byName('Blocked Karate').rejectionReason).toBe('lookup_blocked_by_robots')
    expect(byName('Broken Karate').rejectionReason).toBe('lookup_failed')
    const all = await listDeskProspects(dbHandle.db, 'all')
    expect(all).toHaveLength(7)
    const filtered = await listDeskProspects(dbHandle.db, 'all', { state: 'rejected', reason: 'third_party_email' })
    expect(filtered.map(item => item.name)).toEqual(['Pixel Karate'])
    const summary = await prospectDeskSummary(dbHandle.db)
    expect(summary.rejected).toBe(6)
    expect(summary.rejectedByReason.missing_city).toBe(1)
  })

  it('re-checks stored rows so bad emails are not ready', async () => {
    dbHandle = await openTestDatabase()
    const base = { city: 'Columbus', state: 'OH' }
    await createManualProspect(dbHandle.db, { ...base, name: 'Black Widow', website: 'https://blackwidow.example', email: 'blackwidowmmatx@gmail.com\\', emailSourceUrl: 'https://blackwidow.example/' })
    await createManualProspect(dbHandle.db, { ...base, name: 'Pixel', website: 'https://pixel.example', email: 'matt@pixelspread.com', emailSourceUrl: 'https://pixel.example/' })
    await createManualProspect(dbHandle.db, { ...base, name: 'Impallari', website: 'https://impallari.example', email: 'impallari@gmail.com', emailSourceUrl: 'https://impallari.example/' })
    // Simulate rows stored before the rules: force them ready, then re-check.
    await dbHandle.db.update(salesProspects).set({ outreachStatus: 'ready', rejectionReason: null })
    await requalifyStoredProspects(dbHandle.db)
    const rows = await dbHandle.db.select().from(salesProspects)
    expect(rows.map(row => row.outreachStatus)).toEqual(['rejected', 'rejected', 'rejected'])
    expect(rows.find(row => row.name === 'Black Widow')?.email).toBe('blackwidowmmatx@gmail.com')
  })
})

describe('homepage lookup coverage', () => {
  it('looks up at most the cap per run, only new sites, and reports progress', async () => {
    dbHandle = await openTestDatabase()
    const total = LOOKUPS_PER_RUN + 20
    const elements = Array.from({ length: total }, (_, index) => element(index + 1, {
      name: `Dojo ${String.fromCharCode(97 + (index % 26))}${index} Karate`,
      website: `https://site${index}.example`,
    }))
    const html = Object.fromEntries(elements.map((item, index) => [
      `site${index}.example`,
      `<h1>${item.tags.name}</h1><a href="mailto:hi@site${index}.example">mail</a>`,
    ]))
    const calls: string[] = []
    const first = await ingestDiscoveryElements(dbHandle.db, 'OH', elements, pages(html, calls))
    expect(calls).toHaveLength(LOOKUPS_PER_RUN)
    expect(first.detail).toBe(`Looked up ${LOOKUPS_PER_RUN} of ${total} sites; run again to continue`)
    const firstCalls = new Set(calls)
    calls.length = 0
    const second = await ingestDiscoveryElements(dbHandle.db, 'OH', elements, pages(html, calls))
    expect(calls).toHaveLength(20)
    expect(calls.some(host => firstCalls.has(host))).toBe(false)
    expect(second.detail).toBe('All sites looked up')
    expect(await dbHandle.db.select().from(salesProspectLookups)).toHaveLength(total)
    const third = await ingestDiscoveryElements(dbHandle.db, 'OH', elements, pages(html, calls))
    expect(calls).toHaveLength(20)
    expect(third.detail).toBe('All sites looked up')
    const stored = await dbHandle.db.select().from(salesProspects).where(eq(salesProspects.outreachStatus, 'awaiting_approval'))
    expect(stored).toHaveLength(total)
  })
})

describe('overpass retry', () => {
  it('retries the main endpoint once after a 503 and reports every error when it fails', async () => {
    const waits: number[] = []
    let calls = 0
    const flaky = (async () => {
      calls += 1
      return calls === 1 ? new Response('', { status: 503 }) : new Response(JSON.stringify({ elements: [] }))
    }) as typeof fetch
    expect(await fetchOverpass('q', { fetchImpl: flaky, wait: async ms => void waits.push(ms) })).toEqual([])
    expect(calls).toBe(2)
    expect(waits).toHaveLength(1)

    const down = (async () => new Response('', { status: 429 })) as typeof fetch
    await expect(fetchOverpass('q', { fetchImpl: down, wait: async () => {} })).rejects.toThrow(/overpass-api\.de.*429.*429/)
    let fatalCalls = 0
    const fatal = (async () => {
      fatalCalls += 1
      return new Response('', { status: 400 })
    }) as typeof fetch
    await expect(fetchOverpass('q', { fetchImpl: fatal, wait: async () => {} })).rejects.toThrow(/400/)
    expect(fatalCalls).toBe(1)
  })
})
