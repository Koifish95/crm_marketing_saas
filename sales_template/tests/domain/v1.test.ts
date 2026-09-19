import { afterEach, describe, expect, it } from 'vitest'
import { addOpportunityLine, listOffers } from '../../server/services/commercial'
import { salesDashboard } from '../../server/services/reporting'
import {
  convertLead,
  createActivity,
  createCompany,
  createContact,
  createLead,
  createOpportunity,
  getCompany,
  listActivities,
  listCompanies,
  listNotes,
  listOpportunities,
  markOpportunityLost,
  markOpportunityWon,
  opportunityServeHandoff,
  reopenOpportunity,
  updateActivity,
  updateOpportunity,
} from '../../server/services/sales'
import { users } from '../../server/database/schema'
import { openTestDatabase } from '../helpers/db'
import { activityQueueFromQuery } from '../../shared/utils/queue'
import { OPPORTUNITY_STAGES } from '../../shared/utils/pipeline'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
})

async function ownerId() {
  const [admin] = await dbHandle!.db.select().from(users).limit(1)
  return admin!.id
}

describe('Sales Minimum V1', () => {
  it('keeps existing proposal_quote seed data valid while new opportunities start at Working', async () => {
    dbHandle = await openTestDatabase()
    const seeded = (await listOpportunities(dbHandle.db)).find(row => row.name === 'Advisory retainer')
    expect(seeded?.stage).toBe('proposal_quote')
    expect(OPPORTUNITY_STAGES).toContain('working')
    expect(OPPORTUNITY_STAGES).toContain('proposal_quote')

    const company = await createCompany(dbHandle.db, { name: 'Example Academy' })
    const created = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      name: 'Martial Arts CRM',
      ownerUserId: await ownerId(),
    })
    expect(created.stage).toBe('working')
    const quoting = await updateOpportunity(dbHandle.db, created.id, { stage: 'proposal_quote' })
    expect(quoting.stage).toBe('proposal_quote')
    const deciding = await updateOpportunity(dbHandle.db, created.id, { stage: 'decision' })
    expect(deciding.stage).toBe('decision')
  })

  it('converts inbound leads into Working opportunities without deleting the Lead', async () => {
    dbHandle = await openTestDatabase()
    const lead = await createLead(dbHandle.db, {
      displayName: 'Inbound Owner',
      email: 'inbound@example.com',
      ownerUserId: await ownerId(),
    })
    const result = await convertLead(dbHandle.db, lead.id, await ownerId())
    expect(result.lead.stage).toBe('converted')
    expect(result.opportunity.stage).toBe('working')
    expect(result.company.name).toBe('Inbound Owner')
  })

  it('stores company firmographics and lists lifecycle separately from Active', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, {
      name: 'Kaysville Academy',
      website: 'https://academy.example',
      phone: '555-0140',
      city: 'Kaysville',
      state: 'UT',
    })
    expect(company.website).toBe('https://academy.example')
    expect(company.phone).toBe('555-0140')
    expect(company.city).toBe('Kaysville')
    expect(company.state).toBe('UT')
    expect(company.lifecycle).toBe('prospect')
    expect(company.active).toBe(true)
    const prospects = await listCompanies(dbHandle.db, { lifecycle: 'prospect' })
    expect(prospects.some(row => row.id === company.id)).toBe(true)
  })

  it('requires an outcome for calls, completes with notes, and schedules the next activity in one step', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Pursuit Co' })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      name: 'Martial Arts CRM',
      ownerUserId: await ownerId(),
    })
    const first = await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      ownerUserId: await ownerId(),
      type: 'call',
      description: 'Call owner',
      dueAt: Date.now() - 86_400_000,
    })
    await expect(updateActivity(dbHandle.db, first.id, { completed: true })).rejects.toThrow(/outcome/)
    const later = Date.now() + 2 * 86_400_000
    const completed = await updateActivity(dbHandle.db, first.id, {
      completed: true,
      outcome: 'no_answer',
      notes: 'Called owner. No answer.',
      nextActivity: {
        type: 'call',
        description: 'Try again',
        dueAt: later,
      },
    })
    expect(completed.status).toBe('completed')
    expect(completed.outcome).toBe('no_answer')
    expect(completed.notes).toBe('Called owner. No answer.')
    expect(completed.nextActivity?.description).toBe('Try again')
    expect(completed.nextActivity?.status).toBe('open')
    const upcoming = await listActivities(dbHandle.db, { opportunityId: opportunity.id, queue: 'upcoming' })
    expect(upcoming.some(row => row.id === completed.nextActivity?.id)).toBe(true)
    const listed = await listOpportunities(dbHandle.db, { accountId: company.id })
    expect(listed[0]?.nextActivity?.description).toBe('Try again')
  })

  it('persists meeting outcomes and due dates on the opportunity work surface', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Demo Co' })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      name: 'Demo pursuit',
      ownerUserId: await ownerId(),
    })
    const meeting = await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      ownerUserId: await ownerId(),
      type: 'meeting',
      description: 'Product demo',
      dueAt: Date.now() + 3_600_000,
    })
    const done = await updateActivity(dbHandle.db, meeting.id, {
      completed: true,
      outcome: 'meeting_held',
      notes: 'Walked through Martial Arts CRM.',
    })
    expect(done.outcome).toBe('meeting_held')
    const history = await listActivities(dbHandle.db, { opportunityId: opportunity.id, queue: 'completed' })
    expect(history[0]?.outcome).toBe('meeting_held')
    expect(history[0]?.dueAt).not.toBeNull()
  })

  it('initializes activity queues from deep-link query values', () => {
    expect(activityQueueFromQuery('overdue')).toBe('overdue')
    expect(activityQueueFromQuery('due_today')).toBe('due_today')
    expect(activityQueueFromQuery('upcoming')).toBe('upcoming')
    expect(activityQueueFromQuery('completed')).toBe('completed')
    expect(activityQueueFromQuery('cancelled')).toBe('cancelled')
    expect(activityQueueFromQuery(undefined)).toBe('open')
    expect(activityQueueFromQuery('not-a-queue')).toBe('open')
  })

  it('filters the overdue queue and exposes operational dashboard work', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Queue Co' })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      name: 'Queue deal',
      ownerUserId: await ownerId(),
    })
    const overdue = await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      ownerUserId: await ownerId(),
      type: 'call',
      description: 'Overdue call',
      dueAt: Date.now() - 3 * 86_400_000,
    })
    const future = await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      ownerUserId: await ownerId(),
      type: 'call',
      description: 'Later call',
      dueAt: Date.now() + 5 * 86_400_000,
    })
    const overdueQueue = await listActivities(dbHandle.db, { queue: 'overdue' })
    expect(overdueQueue.some(row => row.id === overdue.id)).toBe(true)
    expect(overdueQueue.some(row => row.id === future.id)).toBe(false)
    const report = await salesDashboard(dbHandle.db, { preset: 'this_year' })
    expect(report.work.overdue.some(row => row.id === overdue.id)).toBe(true)
    expect(report.work.openOpportunities.some(row => row.id === opportunity.id && row.nextActivity?.id === overdue.id)).toBe(true)
  })

  it('cancels remaining open activities on Won by default, keeps completed history, and does not restore them on Reopen', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Close Co' })
    const contact = await createContact(dbHandle.db, {
      accountId: company.id,
      firstName: 'Pat',
      lastName: 'Owner',
      email: 'pat@close.example',
    })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      primaryContactId: contact.id,
      name: 'Martial Arts CRM',
      ownerUserId: await ownerId(),
    })
    const done = await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      ownerUserId: await ownerId(),
      type: 'call',
      description: 'Reached owner',
      dueAt: Date.now() - 86_400_000,
    })
    await updateActivity(dbHandle.db, done.id, {
      completed: true,
      outcome: 'reached',
      notes: 'Ready to buy.',
    })
    const leftover = await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      ownerUserId: await ownerId(),
      type: 'task',
      description: 'Send contract reminder',
      dueAt: Date.now() + 86_400_000,
    })
    const won = await markOpportunityWon(dbHandle.db, opportunity.id, { actorUserId: await ownerId() })
    expect(won.stage).toBe('won')
    expect((await getCompany(dbHandle.db, company.id)).lifecycle).toBe('customer')
    expect((await listActivities(dbHandle.db, { opportunityId: opportunity.id, queue: 'cancelled' })).some(row => row.id === leftover.id)).toBe(true)
    expect((await listActivities(dbHandle.db, { opportunityId: opportunity.id, queue: 'completed' })).some(row => row.id === done.id)).toBe(true)
    expect((await listActivities(dbHandle.db, { queue: 'overdue' })).some(row => row.id === leftover.id)).toBe(false)
    const notes = await listNotes(dbHandle.db, 'opportunity', opportunity.id)
    expect(notes.some(row => row.body.includes('Cancelled 1 open activity'))).toBe(true)

    const reopened = await reopenOpportunity(dbHandle.db, opportunity.id)
    expect(reopened.stage).toBe('decision')
    const leftoverAfter = await listActivities(dbHandle.db, { opportunityId: opportunity.id })
    expect(leftoverAfter.find(row => row.id === leftover.id)?.status).toBe('cancelled')
  })

  it('cancels open activities on Lost and exposes a serve checklist with commercial terms after Won', async () => {
    dbHandle = await openTestDatabase()
    const company = await createCompany(dbHandle.db, { name: 'Serve Co' })
    const contact = await createContact(dbHandle.db, {
      accountId: company.id,
      firstName: 'Morgan',
      lastName: 'Manager',
      email: 'morgan@serve.example',
    })
    const opportunity = await createOpportunity(dbHandle.db, {
      accountId: company.id,
      primaryContactId: contact.id,
      name: 'Martial Arts CRM',
      ownerUserId: await ownerId(),
    })
    const offers = await listOffers(dbHandle.db)
    const monthly = offers.find(row => row.name === 'Martial Arts CRM')
    const setup = offers.find(row => row.name === 'Provisioning / Setup')
    expect(monthly?.pricingType).toBe('monthly')
    expect(monthly?.defaultUnitPriceCents).toBe(25000)
    expect(setup?.pricingType).toBe('one_time')
    expect(setup?.defaultUnitPriceCents).toBe(50000)
    await addOpportunityLine(dbHandle.db, {
      opportunityId: opportunity.id,
      offerId: monthly!.id,
    })
    await addOpportunityLine(dbHandle.db, {
      opportunityId: opportunity.id,
      offerId: setup!.id,
    })
    await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      ownerUserId: await ownerId(),
      type: 'task',
      description: 'Follow up',
      dueAt: Date.now() + 86_400_000,
    })
    const won = await markOpportunityWon(dbHandle.db, opportunity.id)
    expect(won.amountCents).toBe(50000)
    expect(won.mrrCents).toBe(25000)
    const handoff = await opportunityServeHandoff(dbHandle.db, opportunity.id)
    expect(handoff.companyName).toBe('Serve Co')
    expect(handoff.oneTimeCents).toBe(50000)
    expect(handoff.mrrCents).toBe(25000)
    expect(handoff.primaryContact?.name).toBe('Morgan Manager')
    expect(handoff.lines).toHaveLength(2)
    expect(handoff.nextSteps[0]).toMatch(/Control Plane/)

    const lostCompany = await createCompany(dbHandle.db, { name: 'Lost Academy' })
    const lostOpp = await createOpportunity(dbHandle.db, {
      accountId: lostCompany.id,
      name: 'No deal',
      ownerUserId: await ownerId(),
    })
    const open = await createActivity(dbHandle.db, {
      opportunityId: lostOpp.id,
      ownerUserId: await ownerId(),
      type: 'call',
      description: 'Chase',
      dueAt: Date.now() + 86_400_000,
    })
    await markOpportunityLost(dbHandle.db, lostOpp.id, { lossReason: 'timing' })
    expect((await listActivities(dbHandle.db, { opportunityId: lostOpp.id })).find(row => row.id === open.id)?.status).toBe('cancelled')
  })
})
