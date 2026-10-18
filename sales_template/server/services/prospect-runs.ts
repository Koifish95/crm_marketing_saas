import { and, desc, eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import { salesProspectLookups, salesProspectObservations, salesProspectRuns } from '../database/schema'
import { qualificationFailure } from '../../shared/utils/prospect-desk'
import { normalizeState } from '../../shared/utils/prospect'
import { utcNowMs } from '../../shared/utils/time'
import { overpassQueryForState, prospectsFromOverpassDocument, type OverpassElement } from './prospect-discovery'
import { chooseSiteEmail, extractPublicContacts, pageMentionsAcademy, robotsAllowsHomepage } from './prospect-enrichment'
import { readProspectDeskConfig } from './prospect-desk-settings'
import { ingestProspect, requalifyStoredProspects, type ProspectIngestInput } from './prospects'

const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter']
const OVERPASS_RETRY_STATUSES = [429, 502, 503, 504]
const OVERPASS_RETRY_WAIT_MS = 5000

export const LOOKUPS_PER_RUN = 100
const LOOKUP_TIMEOUT_MS = 8000
const LOOKUP_REASONS = ['missing_email', 'email_not_on_site', 'third_party_email']

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

type LookupRecord = typeof salesProspectLookups.$inferSelect
type LookupOutcome = Pick<LookupRecord, 'result' | 'email' | 'emailEvidence' | 'emailSourceUrl' | 'phone'>

function homepageKey(website: string | null | undefined) {
  const text = website?.trim()
  if (!text) {
    return null
  }
  try {
    const url = new URL(text.startsWith('http') ? text : `https://${text}`)
    return `${url.protocol}//${url.hostname.toLowerCase().replace(/^www\./, '')}/`
  } catch {
    return null
  }
}

function lookupOutcome(result: string, extra: Partial<LookupOutcome> = {}): LookupOutcome {
  return { result, email: null, emailEvidence: null, emailSourceUrl: null, phone: null, ...extra }
}

async function lookUpHomepage(input: ProspectIngestInput, fetchImpl: typeof fetch): Promise<LookupOutcome> {
  try {
    const pageUrl = new URL(input.website!.startsWith('http') ? input.website! : `https://${input.website}`)
    const robotsResponse = await fetchImpl(new URL('/robots.txt', pageUrl), { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) })
    if (robotsResponse.ok && !robotsAllowsHomepage(await robotsResponse.text())) {
      return lookupOutcome('blocked_by_robots')
    }
    const pageResponse = await fetchImpl(pageUrl, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) })
    if (!pageResponse.ok) {
      return lookupOutcome('failed')
    }
    const html = await pageResponse.text()
    if (!pageMentionsAcademy(html, input.name)) {
      return lookupOutcome('name_not_on_page')
    }
    const contacts = extractPublicContacts(html, input.name)
    const chosen = chooseSiteEmail(contacts.candidates, input.website!)
    const phone = contacts.phones[0] ?? null
    if (!chosen) {
      return lookupOutcome('no_email', { phone })
    }
    return lookupOutcome('email_found', {
      email: chosen.address,
      emailEvidence: chosen.evidence,
      emailSourceUrl: pageUrl.toString(),
      phone,
    })
  } catch {
    return lookupOutcome('failed')
  }
}

function applyLookup(input: ProspectIngestInput, outcome: LookupOutcome): ProspectIngestInput {
  if (outcome.result === 'email_found' && outcome.email) {
    return {
      ...input,
      email: outcome.email,
      emailEvidence: outcome.emailEvidence,
      emailSourceUrl: outcome.emailSourceUrl,
      phone: input.phone ?? outcome.phone,
    }
  }
  if (outcome.result === 'blocked_by_robots') {
    return { ...input, lookupFailure: 'lookup_blocked_by_robots' }
  }
  if (outcome.result === 'failed') {
    return { ...input, lookupFailure: 'lookup_failed' }
  }
  return { ...input, phone: input.phone ?? outcome.phone }
}

function needsLookup(input: ProspectIngestInput) {
  const failure = qualificationFailure(input)
  return Boolean(failure && LOOKUP_REASONS.includes(failure) && homepageKey(input.website))
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
  const lookups = new Map((await db.select().from(salesProspectLookups)).map(row => [row.homepageUrl, row]))
  const sites = new Set(parsed.prospects.filter(needsLookup).map(prospect => homepageKey(prospect.website)!))
  let stored = 0
  let rejected = parsed.skipped.length
  let fetches = 0
  for (const prospect of parsed.prospects) {
    const [known] = await db.select({ id: salesProspectObservations.id }).from(salesProspectObservations).where(and(
      eq(salesProspectObservations.source, prospect.source),
      eq(salesProspectObservations.externalId, prospect.externalId),
    )).limit(1)
    if (known) {
      continue
    }
    let candidate = prospect
    if (needsLookup(candidate)) {
      const key = homepageKey(candidate.website)!
      let outcome: LookupOutcome | undefined = lookups.get(key)
      if (!outcome) {
        if (fetches >= LOOKUPS_PER_RUN) {
          continue
        }
        fetches += 1
        outcome = await lookUpHomepage(candidate, fetchImpl)
        const [row] = await db.insert(salesProspectLookups).values({
          homepageUrl: key,
          ...outcome,
          lookedUpAt: stamp(),
        }).returning()
        lookups.set(key, row!)
      }
      candidate = applyLookup(candidate, outcome)
    }
    const result = await ingestProspect(db, candidate)
    if (result.outcome === 'created') {
      if (result.prospect.outreachStatus === 'rejected') {
        rejected += 1
      } else {
        stored += 1
      }
    }
  }
  const looked = [...sites].filter(key => lookups.has(key)).length
  return {
    stored,
    rejected,
    lookedUp: looked,
    sites: sites.size,
    detail: looked < sites.size ? `Looked up ${looked} of ${sites.size} sites; run again to continue` : 'All sites looked up',
  }
}

export async function fetchOverpass(query: string, options: {
  fetchImpl?: typeof fetch
  wait?: (ms: number) => Promise<void>
} = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const wait = options.wait ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const errors: string[] = []
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetchImpl(endpoint, {
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
          errors.push(`${endpoint} returned ${response.status}`)
          if (attempt === 1 && OVERPASS_RETRY_STATUSES.includes(response.status)) {
            await wait(OVERPASS_RETRY_WAIT_MS)
            continue
          }
          break
        }
        const document = await response.json() as { elements?: OverpassElement[] }
        if (!Array.isArray(document.elements)) {
          errors.push(`${endpoint} did not return elements`)
          break
        }
        return document.elements
      } catch (error) {
        errors.push(`${endpoint} failed: ${error instanceof Error ? error.message : 'request error'}`)
        break
      }
    }
  }
  throw new Error(`Overpass request failed. ${errors.join('; ')}`)
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
    await requalifyStoredProspects(db)
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
