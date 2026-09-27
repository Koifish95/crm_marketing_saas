import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { createDb } from '../server/database'
import { migrateDatabase } from '../server/database/migrate'
import { salesProspects } from '../server/database/schema'
import { loadLocalEnv } from '../server/utils/load-env'
import {
  extractPublicContacts,
  pageMentionsAcademy,
  robotsAllowsHomepage,
} from '../server/services/prospect-enrichment'
import { ingestProspect } from '../server/services/prospects'
import { registrableDomain } from '../shared/utils/prospect'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = join(ROOT, 'data', 'prospect-cache', 'sites')
const USER_AGENT = 'NuxxionProspectPool/1.0 (internal SIC research; homepage contact lookup)'
const DELAY_MS = 2000
const DEFAULT_LIMIT = 30

loadLocalEnv()

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function limitArg() {
  const index = process.argv.indexOf('--limit')
  const value = index >= 0 ? Number(process.argv[index + 1]) : DEFAULT_LIMIT
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_LIMIT
}

function cachePath(domain: string) {
  return join(CACHE_DIR, `${domain.replace(/[^a-z0-9.-]+/gi, '_')}.json`)
}

async function readText(url: string) {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, 'accept': 'text/html,text/plain' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  })
  const text = await response.text()
  return { ok: response.ok, status: response.status, finalUrl: response.url, text: text.slice(0, 400_000) }
}

async function main() {
  const limit = limitArg()
  const databaseUrl = process.env.DATABASE_URL ?? 'file:./data/app.sqlite'
  await migrateDatabase(databaseUrl)
  const { client, db } = createDb(databaseUrl)
  const summary = {
    considered: 0,
    fetched: 0,
    cache: 0,
    emailsAdded: 0,
    phonesAdded: 0,
    skippedRobots: 0,
    skippedUnrelated: 0,
    failures: [] as string[],
  }
  try {
    const rows = await db.select().from(salesProspects).where(eq(salesProspects.status, 'review'))
    const targets = rows.filter(row => row.website && !row.email && registrableDomain(row.website)).slice(0, limit)
    summary.considered = targets.length
    mkdirSync(CACHE_DIR, { recursive: true })
    for (const prospect of targets) {
      const domain = registrableDomain(prospect.website)
      if (!domain) {
        continue
      }
      const path = cachePath(domain)
      const rawRef = `data/prospect-cache/sites/${domain.replace(/[^a-z0-9.-]+/gi, '_')}.json`
      let record: {
        url: string
        emails: string[]
        phones: string[]
        mentionsAcademy: boolean
      }
      if (existsSync(path)) {
        record = JSON.parse(readFileSync(path, 'utf8'))
        summary.cache += 1
      } else {
        try {
          const origin = new URL(prospect.website!.startsWith('http') ? prospect.website! : `https://${prospect.website}`).origin
          const robots = await readText(`${origin}/robots.txt`)
          if (robots.ok && !robotsAllowsHomepage(robots.text)) {
            summary.skippedRobots += 1
            writeFileSync(path, JSON.stringify({ url: origin, emails: [], phones: [], mentionsAcademy: false, robots: 'disallow' }))
            await sleep(DELAY_MS)
            continue
          }
          await sleep(DELAY_MS)
          const page = await readText(origin)
          summary.fetched += 1
          if (!page.ok) {
            summary.failures.push(`${prospect.name}: homepage ${page.status}`)
            continue
          }
          const contacts = extractPublicContacts(page.text)
          const mentionsAcademy = pageMentionsAcademy(page.text, prospect.name)
          record = { url: page.finalUrl, emails: contacts.emails, phones: contacts.phones, mentionsAcademy }
          writeFileSync(path, JSON.stringify({ ...record, fetchedAt: new Date().toISOString() }))
          await sleep(DELAY_MS)
        } catch (error) {
          summary.failures.push(`${prospect.name}: ${error instanceof Error ? error.message : 'failed'}`)
          continue
        }
      }
      if (!record.mentionsAcademy) {
        summary.skippedUnrelated += 1
        continue
      }
      const email = record.emails[0]
      const phone = record.phones[0]
      if (!email && !phone) {
        continue
      }
      const result = await ingestProspect(db, {
        name: prospect.name,
        website: prospect.website,
        city: prospect.city,
        state: prospect.state,
        email,
        phone,
        source: 'homepage',
        externalId: `homepage:${domain}`,
        query: 'homepage contact lookup',
        sourceUrl: record.url,
        rawRef,
      })
      if (result.prospect.email && !prospect.email) {
        summary.emailsAdded += 1
      }
      if (result.prospect.phone && !prospect.phone) {
        summary.phonesAdded += 1
      }
    }
  } finally {
    client.close()
  }
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
