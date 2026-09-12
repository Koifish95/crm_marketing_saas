import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import * as schema from '../../server/database/schema'

describe('Sales schema isolation', () => {
  it('does not define Martial Arts gym tables', () => {
    expect(schema).not.toHaveProperty('leads')
    expect(schema).not.toHaveProperty('programs')
    expect(schema).not.toHaveProperty('campaigns')
    expect(schema).toHaveProperty('salesLeads')
    expect(schema).toHaveProperty('salesNotes')
    expect(schema).toHaveProperty('salesAccounts')
    expect(schema).toHaveProperty('salesContacts')
    expect(schema).toHaveProperty('salesOpportunities')
    expect(schema).toHaveProperty('salesActivities')
    expect(schema).toHaveProperty('salesSources')
    expect(schema).toHaveProperty('salesCampaigns')
    expect(schema).toHaveProperty('salesTrackingLinks')
    expect(schema).toHaveProperty('salesOffers')
    expect(schema).toHaveProperty('salesOpportunityLines')
    expect(schema).toHaveProperty('users')
  })

  it('did not copy the Martial Arts drizzle journal', () => {
    const journalPath = fileURLToPath(new URL('../../drizzle/migrations/meta/_journal.json', import.meta.url))
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: Array<{ tag: string }> }
    expect(journal.entries.length).toBeGreaterThan(0)
    expect(journal.entries.some(entry => entry.tag.includes('0020'))).toBe(false)
  })
})
