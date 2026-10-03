import { desc, eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import { salesProspectRuns } from '../database/schema'
import { qualificationFailure } from '../../shared/utils/prospect-desk'
import { normalizeState } from '../../shared/utils/prospect'
import { utcNowMs } from '../../shared/utils/time'
import { overpassQueryForState, prospectsFromOverpassDocument, type OverpassElement } from './prospect-discovery'
import { extractPublicContacts, pageMentionsAcademy, robotsAllowsHomepage } from './prospect-enrichment'
import { readProspectDeskConfig } from './prospect-desk-settings'
import { ingestProspect, type ProspectIngestInput } from './prospects'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const runningTasks = new Set<Promise<void>>()

function stamp(ms = utcNowMs()) {
  return new Date(ms)
}

export async function storeQualifiedProspects(db: Database, inputs: ProspectIngestInput[]) {
  let stored = 0
  let rejected = 0
  for (const input of inputs) {
    if (qualificationFailure(input)) {
      rejected += 1
      continue
    }
    const result = await ingestProspect(db, input)
    if (result.outcome === 'created') {
      stored += 1
    }
  }
  return { stored, rejected }
}

async function enrichCandidate(input: ProspectIngestInput, fetchImpl: typeof fetch) {
  if (!qualificationFailure(input) || !input.website) {
    return input
  }
  try {
    const pageUrl = new URL(input.website.startsWith('http') ? input.website : `https://${input.website}`)
    const robotsResponse = await fetchImpl(new URL('/robots.txt', pageUrl), { signal: AbortSignal.timeout(8000) })
    if (robotsResponse.ok) {
      const robots = await robotsResponse.text()
      if (!robotsAllowsHomepage(robots)) {
        return input
      }
    }
    const pageResponse = await fetchImpl(pageUrl, { signal: AbortSignal.timeout(8000) })
    if (!pageResponse.ok) {
      return input
    }
    const html = await pageResponse.text()
    if (!pageMentionsAcademy(html, input.name)) {
      return input
    }
    const contacts = extractPublicContacts(html)
    const email = contacts.emails[0]
    if (!email) {
      return input
    }
    return {
      ...input,
      email,
      phone: input.phone ?? contacts.phones[0] ?? null,
      emailSourceUrl: pageUrl.toString(),
    }
  } catch {
    return input
  }
}

export async function ingestDiscoveryElements(
  db: Database,
  stateCode: string,
  elements: OverpassElement[],
  fetchImpl: typeof fetch = fetch,
) {
  const parsed = prospectsFromOverpassDocument({ elements }, {
    query: `US-${stateCode} openstreetmap martial arts`,
    defaultState: stateCode,
  })
  let stored = 0
  let rejected = parsed.skipped.length
  let fetches = 0
  for (const prospect of parsed.prospects) {
    let candidate = prospect
    if (qualificationFailure(candidate) && candidate.website && fetches < 30) {
      fetches += 1
      candidate = await enrichCandidate(candidate, fetchImpl)
    }
    if (qualificationFailure(candidate)) {
      rejected += 1
      continue
    }
    const result = await ingestProspect(db, candidate)
    if (result.outcome === 'created') {
      stored += 1
    }
  }
  return {
    stored,
    rejected,
    detail: fetches >= 30 ? 'Homepage lookup stopped after 30 sites. Run this state again for the rest.' : null,
  }
}

async function fetchOverpass(query: string) {
  let lastError: unknown = null
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'NuxxionProspectPool/1.0 (internal SIC research; one state)',
          'accept': 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(180_000),
      })
      if (!response.ok) {
        lastError = new Error(`${endpoint} returned ${response.status}`)
        continue
      }
      const document = await response.json() as { elements?: OverpassElement[] }
      if (!Array.isArray(document.elements)) {
        lastError = new Error(`${endpoint} did not return elements`)
        continue
      }
      return document.elements
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Overpass request failed')
}

export async function latestProspectRun(db: Database) {
  const [row] = await db.select().from(salesProspectRuns).orderBy(desc(salesProspectRuns.id)).limit(1)
  return row ?? null
}

export async function getProspectRun(db: Database, id: number) {
  const [row] = await db.select().from(salesProspectRuns).where(eq(salesProspectRuns.id, id)).limit(1)
  return row ?? null
}

export async function startProspectDiscovery(db: Database, stateCode: string) {
  const config = await readProspectDeskConfig(db)
  if (!config.enabled) {
    throw new DomainError('Prospect desk is off.', 404)
  }
  const state = normalizeState(stateCode)
  if (!state || !config.practiceStates.includes(state)) {
    throw new DomainError('That state is outside the practice list.')
  }
  const runs = await db.select().from(salesProspectRuns).where(eq(salesProspectRuns.status, 'running'))
  const current = runs.find(run => utcNowMs() - run.startedAt.getTime() < 15 * 60_000)
  if (current) {
    return current
  }
  for (const stale of runs) {
    await db.update(salesProspectRuns).set({
      status: 'failed',
      error: 'The previous discovery run did not finish.',
      finishedAt: stamp(),
    }).where(eq(salesProspectRuns.id, stale.id))
  }
  const startedAt = stamp()
  const [run] = await db.insert(salesProspectRuns).values({
    stateCode: state,
    status: 'running',
    storedCount: 0,
    rejectedCount: 0,
    startedAt,
  }).returning()
  if (!run) {
    throw new DomainError('Discovery could not start.')
  }
  const task = executeDiscovery(db, run.id, state)
  runningTasks.add(task)
  void task.finally(() => runningTasks.delete(task))
  return run
}

async function executeDiscovery(db: Database, runId: number, state: string) {
  try {
    const elements = await fetchOverpass(overpassQueryForState(state))
    const result = await ingestDiscoveryElements(db, state, elements)
    await db.update(salesProspectRuns).set({
      status: 'done',
      storedCount: result.stored,
      rejectedCount: result.rejected,
      detail: result.detail,
      finishedAt: stamp(),
    }).where(eq(salesProspectRuns.id, runId))
  } catch (error) {
    await db.update(salesProspectRuns).set({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Discovery failed.',
      finishedAt: stamp(),
    }).where(eq(salesProspectRuns.id, runId))
  }
}
