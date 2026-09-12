import { afterEach, describe, expect, it } from 'vitest'
import {
  createActivity,
  createCompany,
  createContact,
  createOpportunity,
  listCompanies,
  listOpportunities,
  updateActivity,
  updateOpportunity,
} from '../../server/services/sales'
import { openTestDatabase } from '../helpers/db'

let dbHandle: Awaited<ReturnType<typeof openTestDatabase>> | undefined

afterEach(async () => {
  await dbHandle?.close()
  dbHandle = undefined
})

describe('Sales domain', () => {
  it('seeds a demo company, contacts, opportunity, and activity', async () => {
    dbHandle = await openTestDatabase()
    const companies = await listCompanies(dbHandle.db)
    expect(companies.length).toBeGreaterThanOrEqual(1)
    expect(companies[0]?.name).toBe('Northwind Advisors')
  })

  it('creates records and moves an opportunity through provisional stages including won and lost', async () => {
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
    })
    expect(opportunity.stage).toBe('open')

    const inProgress = await updateOpportunity(dbHandle.db, opportunity.id, { stage: 'in_progress' })
    expect(inProgress.stage).toBe('in_progress')

    const won = await updateOpportunity(dbHandle.db, opportunity.id, { stage: 'won' })
    expect(won.stage).toBe('won')

    const lost = await updateOpportunity(dbHandle.db, opportunity.id, { stage: 'lost' })
    expect(lost.stage).toBe('lost')

    const activity = await createActivity(dbHandle.db, {
      opportunityId: opportunity.id,
      description: 'Send recap',
    })
    expect(activity.completedAt).toBeNull()
    const done = await updateActivity(dbHandle.db, activity.id, { completed: true })
    expect(done.completedAt).not.toBeNull()

    const listed = await listOpportunities(dbHandle.db, { accountId: company.id })
    expect(listed.some(row => row.id === opportunity.id)).toBe(true)
  })
})
