import { afterEach, describe, expect, it } from 'vitest'
import {
  convertLead,
  createActivity,
  createCompany,
  createContact,
  createLead,
  createNote,
  createOpportunity,
  listActivities,
  listCompanies,
  listNotes,
  listOpportunities,
  markOpportunityLost,
  markOpportunityWon,
  reopenOpportunity,
  updateActivity,
  updateLead,
  updateOpportunity,
} from '../../server/services/sales'
import { users } from '../../server/database/schema'
import { openTestDatabase } from '../helpers/db'
import { activityQueueBucket } from '../../shared/utils/queue'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
})

async function ownerId() {
  const [admin] = await dbHandle!.db.select().from(users).limit(1)
  return admin!.id
}

describe('Sales domain', () => {
  it('seeds a demo company, contacts, opportunity, and activity', async () => {
    dbHandle = await openTestDatabase()
    const companies = await listCompanies(dbHandle.db)
    expect(companies.length).toBeGreaterThanOrEqual(1)
    expect(companies[0]?.name).toBe('Northwind Advisors')
  })

  it('rejects a Lead without phone, email, or reachability note', async () => {
    dbHandle = await openTestDatabase()
    await expect(createLead(dbHandle.db, {
      displayName: 'No Reach',
      ownerUserId: await ownerId(),
    })).rejects.toThrow(/phone, email, or reachability note/)
  })

  it('creates a Lead without a Company and walks New → Contacted → Qualified', async () => {
    dbHandle = await openTestDatabase()
    const lead = await createLead(dbHandle.db, {
      displayName: 'Riley Stone',
      email: 'riley@example.com',
      ownerUserId: await ownerId(),
    })
    expect(lead.accountId).toBeNull()
    expect(lead.stage).toBe('new')
    const contacted = await updateLead(dbHandle.db, lead.id, { stage: 'contacted' })
    expect(contacted.stage).toBe('contacted')
    const qualified = await updateLead(dbHandle.db, lead.id, { stage: 'qualified' })
    expect(qualified.stage).toBe('qualified')
  })

  it('converts a Lead into a person-named Company, Contact, and Opportunity and keeps the Lead', async () => {
    dbHandle = await openTestDatabase()
    const lead = await createLead(dbHandle.db, {
      displayName: 'Alex Rivera',
      phone: '555-2222',
      ownerUserId: await ownerId(),
    })
    const result = await convertLead(dbHandle.db, lead.id, await ownerId())
    expect(result.lead.stage).toBe('converted')
    expect(result.lead.convertedOpportunityId).toBe(result.opportunity.id)
    expect(result.company.name).toBe('Alex Rivera')
    expect(result.opportunity.accountId).toBe(result.company.id)
    expect(result.opportunity.primaryContactId).toBe(result.contact.id)
    expect(result.opportunity.stage).toBe('proposal_quote')
    expect(result.opportunity.sourceLeadId).toBe(lead.id)
    const stillThere = await convertLead(dbHandle.db, lead.id, await ownerId()).catch((error: Error) => error.message)
    expect(stillThere).toMatch(/already converted/)
  })

  it('moves an opportunity Proposal/Quote → Decision → Won and requires Reopen before Lost', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Acme Analytics' })
    const contact = await createContact(dbHandle.db, {
      accountId: company.id,
      firstName: 'Sam',
      lastName: 'Lee',
      email: 'sam@acme.example',
    })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      primaryContactId: contact.id,
      name: 'Pilot engagement',
      ownerUserId: await ownerId(),
    })
    expect(opportunity.stage).toBe('proposal_quote')

    const deciding = await updateOpportunity(dbHandle.db, opportunity.id, { stage: 'decision' })
    expect(deciding.stage).toBe('decision')

    const won = await markOpportunityWon(dbHandle.db, opportunity.id)
    expect(won.stage).toBe('won')

    await expect(updateOpportunity(dbHandle.db, opportunity.id, { stage: 'decision' }))
      .rejects.toThrow(/terminal/)
    await expect(markOpportunityLost(dbHandle.db, opportunity.id, { lossReason: 'budget' }))
      .rejects.toThrow(/terminal/)

    const reopened = await reopenOpportunity(dbHandle.db, opportunity.id)
    expect(reopened.stage).toBe('decision')
    const lost = await markOpportunityLost(dbHandle.db, opportunity.id, { lossReason: 'budget' })
    expect(lost.stage).toBe('lost')
    expect(lost.lossReason).toBe('budget')

    const listed = await listOpportunities(dbHandle.db, { accountId: company.id })
    expect(listed.some(row => row.id === opportunity.id)).toBe(true)
  })

  it('requires explanatory text when Lost reason is Other', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Lost Co' })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      name: 'Unnamed deal',
      ownerUserId: await ownerId(),
    })
    await expect(markOpportunityLost(dbHandle.db, opportunity.id, { lossReason: 'other' }))
      .rejects.toThrow(/explanatory text/)
    const lost = await markOpportunityLost(dbHandle.db, opportunity.id, {
      lossReason: 'other',
      lossNotes: 'They went quiet after pricing.',
    })
    expect(lost.lossNotes).toMatch(/went quiet/)
  })

  it('creates owned activities with type/due and queue buckets', async () => {
    dbHandle = await openTestDatabase()
    const lead = await createLead(dbHandle.db, {
      displayName: 'Queue Lead',
      email: 'queue@example.com',
      ownerUserId: await ownerId(),
    })
    const overdue = await createActivity(dbHandle.db, {
      leadId: lead.id,
      ownerUserId: await ownerId(),
      type: 'call',
      description: 'Yesterday call',
      dueAt: Date.now() - 3 * 86_400_000,
    })
    expect(overdue.ownerUserId).toBe(await ownerId())
    expect(overdue.type).toBe('call')
    const bucket = activityQueueBucket({
      status: overdue.status,
      dueAt: overdue.dueAt,
      nowMs: Date.now(),
    })
    expect(bucket).toBe('overdue')
    const done = await updateActivity(dbHandle.db, overdue.id, { completed: true })
    expect(done.status).toBe('completed')
    expect(done.completedAt).not.toBeNull()
    const open = await listActivities(dbHandle.db, { leadId: lead.id, queue: 'open' })
    expect(open.some(row => row.id === overdue.id)).toBe(false)
  })

  it('stores chronological notes on a Lead', async () => {
    dbHandle = await openTestDatabase()
    const lead = await createLead(dbHandle.db, {
      displayName: 'Notes Lead',
      reachabilityNote: 'Catch them at the office',
      ownerUserId: await ownerId(),
    })
    await createNote(dbHandle.db, {
      recordKind: 'lead',
      recordId: lead.id,
      body: 'Left a voicemail.',
      authorUserId: await ownerId(),
    })
    const notes = await listNotes(dbHandle.db, 'lead', lead.id)
    expect(notes[0]?.body).toBe('Left a voicemail.')
  })
})
