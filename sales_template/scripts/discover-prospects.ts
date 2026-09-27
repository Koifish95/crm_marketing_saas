import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from '../server/database'
import { migrateDatabase } from '../server/database/migrate'
import { loadLocalEnv } from '../server/utils/load-env'
import { ingestProspect } from '../server/services/prospects'
import {
  overpassQueryForUtah,
  prospectsFromOverpassDocument,
  type OverpassElement,
} from '../server/services/prospect-discovery'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_PATH = join(ROOT, 'data', 'prospect-cache', 'overpass', 'us-ut.json')
const QUERY = 'US-UT openstreetmap martial arts'
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const USER_AGENT = 'NuxxionProspectPool/1.0 (internal SIC research; single-state cache)'

loadLocalEnv()

function argFlag(name: string) {
  return process.argv.includes(name)
}

async function fetchOverpass(query: string) {
  let lastError: unknown = null
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': USER_AGENT,
          'accept': 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(180_000),
      })
      if (!response.ok) {
        lastError = new Error(`${endpoint} returned ${response.status}`)
        continue
      }
      const document = await response.json() as { elements?: OverpassElement[], remark?: string }
      if (!Array.isArray(document.elements)) {
        lastError = new Error(document.remark || `${endpoint} did not return elements`)
        continue
      }
      return { document, endpoint }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Overpass request failed')
}

async function loadDocument(refresh: boolean) {
  if (!refresh && existsSync(CACHE_PATH)) {
    const document = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as { elements?: OverpassElement[] }
    return { document, cache: 'hit' as const, endpoint: null }
  }
  const query = overpassQueryForUtah()
  const { document, endpoint } = await fetchOverpass(query)
  mkdirSync(dirname(CACHE_PATH), { recursive: true })
  writeFileSync(CACHE_PATH, JSON.stringify(document))
  return { document, cache: 'miss' as const, endpoint }
}

async function main() {
  const refresh = argFlag('--refresh')
  const databaseUrl = process.env.DATABASE_URL ?? 'file:./data/app.sqlite'
  await migrateDatabase(databaseUrl)
  const { document, cache, endpoint } = await loadDocument(refresh)
  const { prospects, skipped } = prospectsFromOverpassDocument(document, {
    query: QUERY,
    rawRef: 'data/prospect-cache/overpass/us-ut.json',
    defaultState: 'UT',
  })
  const { client, db } = createDb(databaseUrl)
  const summary = {
    state: 'UT',
    cache,
    endpoint,
    sourceElements: document.elements?.length ?? 0,
    unnamedOrFiltered: skipped.length,
    created: 0,
    deduped: 0,
    known: 0,
    failures: [] as string[],
  }
  try {
    for (const prospect of prospects) {
      try {
        const result = await ingestProspect(db, prospect)
        summary[result.outcome] += 1
      } catch (error) {
        summary.failures.push(`${prospect.externalId}: ${error instanceof Error ? error.message : 'failed'}`)
      }
    }
  } finally {
    client.close()
  }
  console.log(JSON.stringify(summary, null, 2))
  if (summary.failures.length) {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
