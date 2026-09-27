import { afterEach, describe, expect, it } from 'vitest'
import { salesAccounts, salesProspectObservations, users } from '../../server/database/schema'
import { prospectsFromOverpassDocument } from '../../server/services/prospect-discovery'
import {
  createManualProspect,
  getProspectDetail,
  ingestProspect,
  listObservations,
  listProspects,
  markProspectDoNotContact,
  promoteProspect,
} from '../../server/services/prospects'
import { createCompany, getCompany, getOpportunity, listActivities, listCompanies, listContacts } from '../../server/services/sales'
import { extractPublicContacts, pageMentionsAcademy, robotsAllowsHomepage } from '../../server/services/prospect-enrichment'
import { registrableDomain } from '../../shared/utils/prospect'
import { openTestDatabase } from '../helpers/db'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
})

async function ownerId() {
  const [admin] = await dbHandle!.db.select().from(users).limit(1)
  return admin!.id
}

describe('homepage contact extraction', () => {
  it('reads public mailto and tel values and honors a full-site robots disallow', () => {
    const contacts = extractPublicContacts('<a href="mailto:info@dojo.example">Email</a><a href="tel:+18015550100">Call</a>')
    expect(contacts.emails).toEqual(['info@dojo.example'])
    expect(contacts.phones).toEqual(['+18015550100'])
    expect(robotsAllowsHomepage('User-agent: *\nDisallow: /')).toBe(false)
    expect(robotsAllowsHomepage('User-agent: *\nDisallow:')).toBe(true)
    expect(pageMentionsAcademy('<title>Oteo Restaurant</title>', 'Royal West Martial Arts')).toBe(false)
    expect(pageMentionsAcademy('<title>Wolves Den Jiu Jitsu</title>', 'Wolves Den Jiu Jitsu')).toBe(true)
  })
})

describe('prospect identity', () => {
  it('uses the registrable domain and ignores social hosts', () => {
    expect(registrableDomain('https://www.Example.com/kids')).toBe('example.com')
    expect(registrableDomain('http://teams.apex.example')).toBe('apex.example')
    expect(registrableDomain('https://dojo.example.co.uk/contact')).toBe('example.co.uk')
    expect(registrableDomain('https://facebook.com/some-academy')).toBeNull()
    expect(registrableDomain('https://city-dojo.wixsite.com/home')).toBe('city-dojo.wixsite.com')
  })
})

describe('prospect pool', () => {
  it('stores a prospect and its provenance', async () => {
    dbHandle = await openTestDatabase()
    const result = await createManualProspect(dbHandle.db, {
      name: 'Example Academy',
      website: 'https://www.example-academy.test',
      city: 'Provo',
      state: 'Utah',
      email: 'hello@example-academy.test',
      phone: '(801) 555-0100',
      discipline: 'Brazilian jiu-jitsu',
      source: 'manual',
      externalId: 'manual:example-1',
      query: 'operator entry',
      sourceUrl: 'https://www.example-academy.test',
    })
    expect(result.outcome).toBe('created')
    expect(result.prospect.status).toBe('review')
    expect(result.prospect.state).toBe('UT')
    expect(result.prospect.domainKey).toBe('example-academy.test')
    const detail = await getProspectDetail(dbHandle.db, result.prospect.id)
    expect(detail.observations).toHaveLength(1)
    expect(detail.observations[0]).toMatchObject({
      source: 'manual',
      externalId: 'manual:example-1',
      query: 'operator entry',
    })
  })

  it('dedupes the same domain and keeps both observations', async () => {
    dbHandle = await openTestDatabase()
    const first = await ingestProspect(dbHandle.db, {
      name: 'Apex Martial Arts',
      website: 'https://www.apex.example/classes',
      city: 'Ogden',
      state: 'UT',
      source: 'openstreetmap',
      externalId: 'node/1',
      query: 'US-UT',
    })
    const second = await ingestProspect(dbHandle.db, {
      name: 'Apex Martial Arts LLC',
      website: 'http://apex.example',
      city: 'Ogden',
      state: 'UT',
      email: 'info@apex.example',
      source: 'openstreetmap',
      externalId: 'way/2',
      query: 'US-UT name search',
    })
    expect(first.outcome).toBe('created')
    expect(second.outcome).toBe('deduped')
    expect(second.prospect.id).toBe(first.prospect.id)
    expect(second.prospect.email).toBe('info@apex.example')
    expect(await listObservations(dbHandle.db, first.prospect.id)).toHaveLength(2)
    expect(await listProspects(dbHandle.db, { search: 'Apex' })).toHaveLength(1)
  })

  it('dedupes the same name, city, and state when there is no website', async () => {
    dbHandle = await openTestDatabase()
    const first = await ingestProspect(dbHandle.db, {
      name: 'Gracie Barra Salt Lake, LLC',
      city: 'Salt Lake City',
      state: 'Utah',
      source: 'openstreetmap',
      externalId: 'node/10',
    })
    const second = await ingestProspect(dbHandle.db, {
      name: 'Gracie Barra Salt Lake Academy',
      city: 'Salt Lake City',
      state: 'UT',
      source: 'openstreetmap',
      externalId: 'node/11',
    })
    expect(second.prospect.id).toBe(first.prospect.id)
    expect(second.outcome).toBe('deduped')
  })

  it('keeps distinct academies distinct and flags a shared phone without merging', async () => {
    dbHandle = await openTestDatabase()
    const north = await ingestProspect(dbHandle.db, {
      name: 'North Dojo',
      city: 'Logan',
      state: 'UT',
      phone: '801-555-1111',
      source: 'openstreetmap',
      externalId: 'node/21',
    })
    const south = await ingestProspect(dbHandle.db, {
      name: 'North Dojo',
      city: 'St. George',
      state: 'UT',
      phone: '(801) 555-1111',
      source: 'openstreetmap',
      externalId: 'node/22',
    })
    const otherSite = await ingestProspect(dbHandle.db, {
      name: 'North Dojo',
      city: 'Logan',
      state: 'UT',
      website: 'https://other-north.example',
      source: 'openstreetmap',
      externalId: 'node/23',
    })
    const secondSite = await ingestProspect(dbHandle.db, {
      name: 'North Dojo',
      city: 'Logan',
      state: 'UT',
      website: 'https://north-dojo.example',
      source: 'openstreetmap',
      externalId: 'node/24',
    })
    expect(south.prospect.id).not.toBe(north.prospect.id)
    expect(otherSite.prospect.id).toBe(north.prospect.id)
    expect(secondSite.prospect.id).not.toBe(north.prospect.id)
    expect(secondSite.prospect.domainKey).toBe('north-dojo.example')
    expect(south.prospect.possibleDuplicateProspectId).toBe(north.prospect.id)
  })

  it('refuses to promote a do-not-contact prospect', async () => {
    dbHandle = await openTestDatabase()
    const created = await ingestProspect(dbHandle.db, {
      name: 'Quiet Academy',
      city: 'Provo',
      state: 'UT',
      email: 'quiet@example.test',
      source: 'manual',
      externalId: 'manual:quiet',
    })
    await markProspectDoNotContact(dbHandle.db, created.prospect.id)
    const before = await listCompanies(dbHandle.db)
    await expect(promoteProspect(dbHandle.db, created.prospect.id, await ownerId())).rejects.toThrow(/Do not contact/)
    expect(await listCompanies(dbHandle.db)).toHaveLength(before.length)
    expect((await getProspectDetail(dbHandle.db, created.prospect.id)).status).toBe('do_not_contact')
  })

  it('promotes into a Working opportunity attributed to Cold Outreach and does not send email', async () => {
    dbHandle = await openTestDatabase()
    const created = await ingestProspect(dbHandle.db, {
      name: 'Ready Academy',
      website: 'https://ready.example',
      city: 'Orem',
      state: 'UT',
      email: 'owner@ready.example',
      phone: '801-555-0199',
      source: 'openstreetmap',
      externalId: 'node/50',
      query: 'US-UT',
    })
    const promoted = await promoteProspect(dbHandle.db, created.prospect.id, await ownerId())
    expect(promoted.status).toBe('promoted')
    expect(promoted.salesAccountId).toBeTruthy()
    const company = await getCompany(dbHandle.db, promoted.salesAccountId!)
    expect(company.name).toBe('Ready Academy')
    expect(company.doNotContact).toBe(false)
    expect(company.lifecycle).toBe('prospect')
    const contacts = await listContacts(dbHandle.db, { accountId: company.id })
    expect(contacts).toHaveLength(1)
    expect(contacts[0]).toMatchObject({
      firstName: 'Front',
      lastName: 'Desk',
      email: 'owner@ready.example',
    })
    const opportunity = await getOpportunity(dbHandle.db, promoted.salesOpportunityId!)
    expect(opportunity.stage).toBe('working')
    expect(opportunity.sourceName).toBe('Cold Outreach')
    expect(opportunity.sourceDetail).toBe(`prospect:${created.prospect.id}`)
    expect(opportunity.accountId).toBe(company.id)
    expect(await listActivities(dbHandle.db, { opportunityId: opportunity.id })).toHaveLength(0)
  })

  it('does not create a second company or opportunity when promoted again or when Sales already has the academy', async () => {
    dbHandle = await openTestDatabase()
    const owner = await ownerId()
    const existing = await createCompany(dbHandle.db, {
      name: 'Summit Martial Arts LLC',
      website: 'https://www.summit.example/home',
      city: 'Provo',
      state: 'Utah',
    })
    const created = await ingestProspect(dbHandle.db, {
      name: 'Summit Martial Arts',
      website: 'https://summit.example',
      city: 'Provo',
      state: 'UT',
      phone: '801-555-0177',
      source: 'openstreetmap',
      externalId: 'node/77',
    })
    const before = await dbHandle.db.select().from(salesAccounts)
    const promoted = await promoteProspect(dbHandle.db, created.prospect.id, owner)
    const after = await dbHandle.db.select().from(salesAccounts)
    expect(after).toHaveLength(before.length)
    expect(promoted.salesAccountId).toBe(existing.id)
    await expect(promoteProspect(dbHandle.db, created.prospect.id, owner)).rejects.toThrow(/already in Sales/)
    expect(await dbHandle.db.select().from(salesAccounts)).toHaveLength(before.length)
    const contacts = await listContacts(dbHandle.db, { accountId: existing.id })
    expect(contacts).toHaveLength(1)
  })

  it('refuses promotion when the matching Sales company is do not contact', async () => {
    dbHandle = await openTestDatabase()
    await createCompany(dbHandle.db, {
      name: 'Closed Academy',
      city: 'Layton',
      state: 'UT',
      doNotContact: true,
    })
    const created = await ingestProspect(dbHandle.db, {
      name: 'Closed Academy',
      city: 'Layton',
      state: 'UT',
      source: 'manual',
      externalId: 'manual:closed',
    })
    await expect(promoteProspect(dbHandle.db, created.prospect.id, await ownerId())).rejects.toThrow(/do not contact/i)
    expect((await getProspectDetail(dbHandle.db, created.prospect.id)).status).not.toBe('promoted')
  })

  it('treats a discovery rerun as already known', async () => {
    dbHandle = await openTestDatabase()
    const parsed = prospectsFromOverpassDocument({
      elements: [
        {
          type: 'node',
          id: 100,
          tags: {
            'name': 'Wasatch Jiu Jitsu',
            'website': 'https://www.wasatch.example',
            'addr:city': 'Heber',
            'addr:state': 'UT',
            'sport': 'brazilian_jiu_jitsu',
            'email': 'info@wasatch.example',
          },
        },
        {
          type: 'way',
          id: 200,
          tags: {
            'name': 'Wasatch Jiu Jitsu',
            'website': 'https://wasatch.example/contact',
            'addr:city': 'Heber',
            'addr:state': 'Utah',
          },
        },
        {
          type: 'node',
          id: 300,
          tags: { amenity: 'restaurant', name: 'Karate Sushi' },
        },
        {
          type: 'node',
          id: 301,
          tags: { name: 'Karate' },
        },
        {
          type: 'node',
          id: 302,
          tags: {
            name: 'Sorenson Multicultural Center',
            sport: 'swimming;basketball;boxing',
          },
        },
      ],
    }, { query: 'US-UT openstreetmap martial arts', defaultState: 'UT', rawRef: 'data/prospect-cache/overpass/us-ut.json' })
    expect(parsed.prospects).toHaveLength(2)
    expect(parsed.skipped).toEqual(['node/300', 'node/301', 'node/302'])
    const firstPass = []
    for (const prospect of parsed.prospects) {
      firstPass.push(await ingestProspect(dbHandle.db, prospect))
    }
    expect(firstPass.map(row => row.outcome)).toEqual(['created', 'deduped'])
    const secondPass = []
    for (const prospect of parsed.prospects) {
      secondPass.push(await ingestProspect(dbHandle.db, prospect))
    }
    expect(secondPass.every(row => row.outcome === 'known')).toBe(true)
    expect(await listProspects(dbHandle.db, { search: 'Wasatch' })).toHaveLength(1)
    const observations = await dbHandle.db.select().from(salesProspectObservations)
    expect(observations).toHaveLength(2)
    expect(observations[0]?.rawRef).toBe('data/prospect-cache/overpass/us-ut.json')
  })
})
