import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq } from 'drizzle-orm'
import { DomainError } from '@crm/core/server/services/errors'
import type { Database } from '../database'
import {
  salesAccounts,
  salesOpportunities,
  salesProspectMessages,
  salesProspectObservations,
  salesProspects,
} from '../database/schema'
import { getSourceByCode } from './acquisition'
import { createCompany, createContact, createNote, createOpportunity, listContacts } from './sales'
import { isActiveOpportunityStage } from '../../shared/utils/pipeline'
import {
  arrivalStatus,
  canPromoteProspectStatus,
  isProspectLane,
  isProspectPriority,
  locationIdentityKey,
  normalizeBusinessName,
  normalizeEmailAddress,
  normalizePhoneKey,
  normalizePlace,
  normalizeState,
  prospectReadiness,
  registrableDomain,
  type ProspectLane,
  type ProspectPriority,
  type ProspectStatus,
} from '../../shared/utils/prospect'
import { isExcludedOutreachState, qualificationFailure } from '../../shared/utils/prospect-desk'
import { utcNowMs } from '../../shared/utils/time'

const COLD_OUTREACH_CODE = 'cold_outreach'

function now() {
  return new Date(utcNowMs())
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export type ProspectIngestInput = {
  name: string
  website?: string | null
  city?: string | null
  state?: string | null
  discipline?: string | null
  email?: string | null
  phone?: string | null
  priority?: ProspectPriority
  lane?: ProspectLane
  notes?: string | null
  source: string
  externalId: string
  query?: string | null
  sourceUrl?: string | null
  rawRef?: string | null
  discoveredAt?: Date
  emailSourceUrl?: string | null
}

export type IngestOutcome = 'created' | 'deduped' | 'known'

function identityOf(input: { name: string, website?: string | null, city?: string | null, state?: string | null, phone?: string | null }) {
  return {
    domainKey: registrableDomain(input.website),
    locationKey: locationIdentityKey(input.name, input.city, input.state),
    phoneKey: normalizePhoneKey(input.phone),
  }
}

async function requireProspect(db: Database, id: number) {
  const [row] = await db.select().from(salesProspects).where(eq(salesProspects.id, id)).limit(1)
  if (!row) {
    throw new DomainError('Prospect not found.', 404)
  }
  return row
}

async function observationFor(db: Database, source: string, externalId: string) {
  const [row] = await db.select().from(salesProspectObservations).where(and(
    eq(salesProspectObservations.source, source),
    eq(salesProspectObservations.externalId, externalId),
  )).limit(1)
  return row ?? null
}

async function prospectByDomain(db: Database, domainKey: string) {
  const [row] = await db.select().from(salesProspects).where(eq(salesProspects.domainKey, domainKey)).limit(1)
  return row ?? null
}

async function prospectByLocation(db: Database, locationKey: string) {
  const [row] = await db.select().from(salesProspects).where(eq(salesProspects.locationKey, locationKey)).limit(1)
  return row ?? null
}

async function flagPossibleDuplicate(db: Database, prospectId: number, phoneKey: string | null) {
  const current = await requireProspect(db, prospectId)
  if (current.possibleDuplicateProspectId || !phoneKey) {
    return
  }
  const others = await db.select().from(salesProspects).where(eq(salesProspects.phoneKey, phoneKey))
  const match = others.find(row => row.id !== prospectId)
  if (!match) {
    return
  }
  await db.update(salesProspects).set({
    possibleDuplicateProspectId: match.id,
    updatedAt: now(),
  }).where(eq(salesProspects.id, prospectId))
}

async function addObservation(db: Database, prospectId: number, input: ProspectIngestInput, discoveredAt: Date) {
  const createdAt = now()
  await db.insert(salesProspectObservations).values({
    prospectId,
    source: input.source.trim(),
    externalId: input.externalId.trim(),
    query: blankToNull(input.query),
    sourceUrl: blankToNull(input.sourceUrl),
    rawRef: blankToNull(input.rawRef),
    discoveredAt,
    createdAt,
  })
}

async function fillProspect(db: Database, id: number, input: ProspectIngestInput) {
  const current = await requireProspect(db, id)
  const website = current.website ?? blankToNull(input.website)
  const city = current.city ?? blankToNull(input.city)
  const state = current.state ?? (normalizeState(input.state) ?? blankToNull(input.state))
  const domainKey = current.domainKey ?? registrableDomain(website)
  let locationKey = current.locationKey
  if (!domainKey && !locationKey) {
    const nextLocation = locationIdentityKey(current.name, city, state)
    if (nextLocation) {
      const taken = await prospectByLocation(db, nextLocation)
      if (!taken || taken.id === id) {
        locationKey = nextLocation
      }
    }
  }
  if (domainKey && domainKey !== current.domainKey) {
    const taken = await prospectByDomain(db, domainKey)
    if (taken && taken.id !== id) {
      return current
    }
  }
  const priority = input.priority === 'high' ? 'high' : current.priority
  const status = current.status === 'new' && (domainKey || locationKey) ? 'review' : current.status
  await db.update(salesProspects).set({
    website,
    domainKey,
    locationKey: domainKey ? current.locationKey : locationKey,
    city,
    state,
    discipline: current.discipline ?? blankToNull(input.discipline),
    email: current.email ?? normalizeEmailAddress(input.email),
    phone: current.phone ?? blankToNull(input.phone),
    phoneKey: current.phoneKey ?? normalizePhoneKey(input.phone ?? current.phone),
    emailSourceUrl: current.emailSourceUrl ?? blankToNull(input.emailSourceUrl),
    priority,
    status,
    updatedAt: now(),
  }).where(eq(salesProspects.id, id))
  await syncOutreachReadiness(db, id)
  return requireProspect(db, id)
}

async function syncOutreachReadiness(db: Database, id: number) {
  const current = await requireProspect(db, id)
  if (current.status === 'promoted' || current.status === 'do_not_contact') {
    return current
  }
  if (current.outreachStatus !== 'none' && current.outreachStatus !== 'ready') {
    return current
  }
  const excluded = isExcludedOutreachState(current.state)
  const failure = qualificationFailure(current)
  await db.update(salesProspects).set({
    lane: excluded ? 'local' : 'national',
    outreachStatus: failure ? 'none' : 'ready',
    updatedAt: now(),
  }).where(eq(salesProspects.id, id))
  return requireProspect(db, id)
}

export async function ingestProspect(db: Database, input: ProspectIngestInput) {
  const name = input.name.trim()
  if (!name) {
    throw new DomainError('Prospect name is required.')
  }
  const source = input.source.trim()
  const externalId = input.externalId.trim()
  if (!source || !externalId) {
    throw new DomainError('Prospect provenance requires a source and external id.')
  }
  if (input.priority && !isProspectPriority(input.priority)) {
    throw new DomainError('Unknown prospect priority.')
  }
  if (input.lane && !isProspectLane(input.lane)) {
    throw new DomainError('Unknown prospect lane.')
  }

  const existingObservation = await observationFor(db, source, externalId)
  if (existingObservation) {
    const prospect = await requireProspect(db, existingObservation.prospectId)
    return { outcome: 'known' as const, prospect }
  }

  const discoveredAt = input.discoveredAt ?? now()
  const identity = identityOf({ ...input, name })
  const domainMatch = identity.domainKey ? await prospectByDomain(db, identity.domainKey) : null
  const locationMatch = identity.locationKey ? await prospectByLocation(db, identity.locationKey) : null
  const match = domainMatch ?? (
    locationMatch && (!identity.domainKey || !locationMatch.domainKey)
      ? locationMatch
      : null
  )

  if (match) {
    await addObservation(db, match.id, input, discoveredAt)
    await fillProspect(db, match.id, { ...input, name })
    await flagPossibleDuplicate(db, match.id, identity.phoneKey)
    return { outcome: 'deduped' as const, prospect: await requireProspect(db, match.id) }
  }

  const state = normalizeState(input.state) ?? blankToNull(input.state)
  const createdAt = now()
  const status = arrivalStatus(identity)
  const storedLocationKey = identity.locationKey && !(await prospectByLocation(db, identity.locationKey))
    ? identity.locationKey
    : null
  const [created] = await db.insert(salesProspects).values({
    name,
    website: blankToNull(input.website),
    domainKey: identity.domainKey,
    city: blankToNull(input.city),
    state,
    discipline: blankToNull(input.discipline),
    email: normalizeEmailAddress(input.email),
    phone: blankToNull(input.phone),
    phoneKey: identity.phoneKey,
    locationKey: storedLocationKey,
    status,
    priority: input.priority ?? 'normal',
    lane: input.lane ?? 'national',
    notes: blankToNull(input.notes),
    emailSourceUrl: blankToNull(input.emailSourceUrl),
    createdAt,
    updatedAt: createdAt,
  }).returning()
  if (!created) {
    throw new DomainError('Prospect could not be stored.')
  }
  await addObservation(db, created.id, { ...input, name }, discoveredAt)
  await flagPossibleDuplicate(db, created.id, identity.phoneKey)
  await syncOutreachReadiness(db, created.id)
  return { outcome: 'created' as const, prospect: await requireProspect(db, created.id) }
}

export async function createManualProspect(db: Database, input: Omit<ProspectIngestInput, 'source' | 'externalId'> & {
  source?: string
  externalId?: string
}) {
  return ingestProspect(db, {
    ...input,
    source: input.source?.trim() || 'manual',
    externalId: input.externalId?.trim() || `manual:${randomUUID()}`,
  })
}

export async function listProspects(db: Database, filters: {
  search?: string
  state?: string
  status?: string
  priority?: string
  lane?: string
} = {}) {
  const rows = await db.select().from(salesProspects).orderBy(desc(salesProspects.updatedAt))
  const stateFilter = filters.state ? normalizeState(filters.state) ?? filters.state.trim().toLowerCase() : null
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) {
      return false
    }
    if (filters.priority && row.priority !== filters.priority) {
      return false
    }
    if (filters.lane && row.lane !== filters.lane) {
      return false
    }
    if (stateFilter) {
      const rowState = normalizeState(row.state) ?? row.state?.trim().toLowerCase()
      if (rowState !== stateFilter) {
        return false
      }
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${row.name} ${row.city ?? ''} ${row.website ?? ''} ${row.email ?? ''} ${row.phone ?? ''} ${row.discipline ?? ''}`.toLowerCase()
      if (!hay.includes(q)) {
        return false
      }
    }
    return true
  }).map(row => ({
    ...row,
    readiness: prospectReadiness(row),
  }))
}

export async function prospectCounts(db: Database) {
  const rows = await db.select({ status: salesProspects.status }).from(salesProspects)
  const counts = {
    new: 0,
    review: 0,
    promoted: 0,
    skipped: 0,
    do_not_contact: 0,
    total: rows.length,
  }
  for (const row of rows) {
    if (row.status in counts && row.status !== 'total') {
      counts[row.status as ProspectStatus] += 1
    }
  }
  return counts
}

export async function getProspectDetail(db: Database, id: number) {
  const prospect = await requireProspect(db, id)
  const observations = await db.select().from(salesProspectObservations)
    .where(eq(salesProspectObservations.prospectId, id))
    .orderBy(asc(salesProspectObservations.discoveredAt))
  let duplicateName: string | null = null
  if (prospect.possibleDuplicateProspectId) {
    const [duplicate] = await db.select({ name: salesProspects.name }).from(salesProspects)
      .where(eq(salesProspects.id, prospect.possibleDuplicateProspectId))
      .limit(1)
    duplicateName = duplicate?.name ?? null
  }
  const messages = await db.select().from(salesProspectMessages)
    .where(eq(salesProspectMessages.prospectId, id))
    .orderBy(asc(salesProspectMessages.step))
  return {
    ...prospect,
    readiness: prospectReadiness(prospect),
    duplicateName,
    observations,
    messages,
  }
}

export async function skipProspect(db: Database, id: number) {
  const prospect = await requireProspect(db, id)
  if (prospect.status === 'promoted') {
    throw new DomainError('Promoted prospects stay in Sales. Skip is for the pool.')
  }
  if (prospect.status === 'do_not_contact') {
    throw new DomainError('Do not contact is already set.')
  }
  await db.update(salesProspects).set({
    status: 'skipped',
    outreachStatus: 'stopped',
    nextTouchAt: null,
    updatedAt: now(),
  }).where(eq(salesProspects.id, id))
  return getProspectDetail(db, id)
}

export async function markProspectDoNotContact(db: Database, id: number) {
  const prospect = await requireProspect(db, id)
  if (prospect.status === 'promoted' && prospect.salesAccountId) {
    await db.update(salesAccounts).set({
      doNotContact: true,
      updatedAt: now(),
    }).where(eq(salesAccounts.id, prospect.salesAccountId))
    return getProspectDetail(db, id)
  }
  if (prospect.status === 'promoted') {
    throw new DomainError('Promoted prospect is missing its Sales company.')
  }
  await db.update(salesProspects).set({
    status: 'do_not_contact',
    outreachStatus: 'stopped',
    nextTouchAt: null,
    updatedAt: now(),
  }).where(eq(salesProspects.id, id))
  return getProspectDetail(db, id)
}

export async function returnProspectToReview(db: Database, id: number) {
  const prospect = await requireProspect(db, id)
  if (prospect.status === 'promoted') {
    throw new DomainError('Promoted prospects are managed in Sales.')
  }
  if (prospect.status !== 'skipped' && prospect.status !== 'do_not_contact') {
    return getProspectDetail(db, id)
  }
  await db.update(salesProspects).set({
    status: 'review',
    updatedAt: now(),
  }).where(eq(salesProspects.id, id))
  return getProspectDetail(db, id)
}

async function findSalesCompany(db: Database, prospect: typeof salesProspects.$inferSelect) {
  const companies = await db.select().from(salesAccounts).orderBy(asc(salesAccounts.id))
  if (prospect.domainKey) {
    const byDomain = companies.find(company => registrableDomain(company.website) === prospect.domainKey)
    if (byDomain) {
      return byDomain
    }
  }
  const prospectName = normalizeBusinessName(prospect.name)
  const prospectState = normalizeState(prospect.state)
  if (!prospectName || !prospectState) {
    return null
  }
  const prospectCity = normalizePlace(prospect.city)
  return companies.find((company) => {
    if (normalizeBusinessName(company.name) !== prospectName) {
      return false
    }
    if (normalizeState(company.state) !== prospectState) {
      return false
    }
    const companyCity = normalizePlace(company.city)
    if (prospectCity && companyCity && prospectCity !== companyCity) {
      return false
    }
    if (!prospectCity && companyCity) {
      return false
    }
    return true
  }) ?? null
}

async function findOpenOpportunity(db: Database, accountId: number) {
  const rows = await db.select().from(salesOpportunities).where(eq(salesOpportunities.accountId, accountId))
  return rows.find(row => isActiveOpportunityStage(row.stage)) ?? null
}

function opportunityName(academyName: string) {
  const suffix = ' — Martial Arts CRM'
  const max = 200 - suffix.length
  const trimmed = academyName.trim().slice(0, Math.max(max, 1))
  return `${trimmed}${suffix}`.slice(0, 200)
}

export async function promoteProspect(db: Database, id: number, actorUserId: number) {
  return db.transaction(async (tx) => {
    const writer = tx as unknown as Database
    const prospect = await requireProspect(writer, id)
    if (prospect.status === 'promoted') {
      throw new DomainError('This prospect is already in Sales.')
    }
    if (prospect.status === 'do_not_contact') {
      throw new DomainError('Do not contact. This prospect cannot be promoted.')
    }
    if (!canPromoteProspectStatus(prospect.status)) {
      throw new DomainError('This prospect cannot be promoted.')
    }

    const existingCompany = await findSalesCompany(writer, prospect)
    if (existingCompany?.doNotContact) {
      throw new DomainError('The matching Sales company is marked do not contact.')
    }

    const company = existingCompany ?? await createCompany(writer, {
      name: prospect.name,
      website: prospect.website ?? undefined,
      phone: prospect.phone ?? undefined,
      city: prospect.city ?? undefined,
      state: prospect.state ?? undefined,
      notes: `Promoted from prospect #${prospect.id}.`,
      lifecycle: 'prospect',
      doNotContact: false,
    })

    let contactId: number | null = null
    if (prospect.email || prospect.phone) {
      const contacts = await listContacts(writer, { accountId: company.id })
      const email = normalizeEmailAddress(prospect.email)
      const phoneKey = normalizePhoneKey(prospect.phone)
      const match = contacts.find((row) => {
        if (email && normalizeEmailAddress(row.email) === email) {
          return true
        }
        return Boolean(phoneKey && normalizePhoneKey(row.phone) === phoneKey)
      })
      if (match) {
        contactId = match.id
      } else {
        const contact = await createContact(writer, {
          accountId: company.id,
          firstName: 'Front',
          lastName: 'Desk',
          email: prospect.email ?? undefined,
          phone: prospect.phone ?? undefined,
          title: 'Public contact',
        })
        contactId = contact.id
      }
    }

    const source = await getSourceByCode(writer, COLD_OUTREACH_CODE)
    const openOpportunity = await findOpenOpportunity(writer, company.id)
    const opportunity = openOpportunity ?? await createOpportunity(writer, {
      accountId: company.id,
      primaryContactId: contactId ?? undefined,
      name: opportunityName(prospect.name),
      stage: 'working',
      ownerUserId: actorUserId,
      sourceId: source.id,
      sourceDetail: `prospect:${prospect.id}`,
    })

    await writer.update(salesProspects).set({
      status: 'promoted',
      outreachStatus: 'stopped',
      nextTouchAt: null,
      salesAccountId: company.id,
      salesContactId: contactId,
      salesOpportunityId: opportunity.id,
      updatedAt: now(),
    }).where(eq(salesProspects.id, prospect.id))

    await createNote(writer, {
      recordKind: 'company',
      recordId: company.id,
      body: existingCompany
        ? `Linked prospect #${prospect.id} (${prospect.name}) to this existing company. No second company was created.`
        : `Promoted prospect #${prospect.id} into this company.`,
      authorUserId: actorUserId,
    })

    return getProspectDetail(writer, prospect.id)
  })
}

export async function listObservations(db: Database, prospectId: number) {
  await requireProspect(db, prospectId)
  return db.select().from(salesProspectObservations)
    .where(eq(salesProspectObservations.prospectId, prospectId))
    .orderBy(asc(salesProspectObservations.discoveredAt))
}
