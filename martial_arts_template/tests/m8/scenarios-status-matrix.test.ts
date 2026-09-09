import { describe, expect, it } from 'vitest'
import { householdDisplayStatus } from '../../shared/utils/labels'
import { getLead, listLeads } from '../../server/services/leads'
import { openTestDatabase } from '../helpers/db'
import {
  convertHouseholdLine,
  createParentChildHousehold,
  createSingleAdultHousehold,
  expectHouseholdStatus,
  markLineLost,
  scheduleValidTrialForLine,
} from './helpers/scenarios'

function display(status: string, lines: Array<{ status: string }>) {
  return householdDisplayStatus({ status, lines })
}

describe('M8 scenarios G — household display status matrix', () => {
  it('maps canonical combinations to exact household labels', () => {
    const cases: Array<{
      name: string
      status: string
      lines: Array<{ status: string }>
      key: string
      label: string
    }> = [
      { name: '1 active NEW line', status: 'NEW', lines: [{ status: 'NEW' }], key: 'ACTIVE', label: 'Active' },
      { name: '1 TRIAL_SCHEDULED line', status: 'TRIAL_SCHEDULED', lines: [{ status: 'TRIAL_SCHEDULED' }], key: 'ACTIVE', label: 'Active' },
      { name: '1 TRIAL_ATTENDED line', status: 'TRIAL_ATTENDED', lines: [{ status: 'TRIAL_ATTENDED' }], key: 'ACTIVE', label: 'Active' },
      { name: '1 converted line', status: 'TRIAL_ATTENDED', lines: [{ status: 'JOINED' }], key: 'JOINED', label: 'Joined' },
      { name: '1 lost line', status: 'LOST', lines: [{ status: 'LOST' }], key: 'LOST', label: 'Lost' },
      { name: '2 active lines', status: 'TRIAL_SCHEDULED', lines: [{ status: 'TRIAL_SCHEDULED' }, { status: 'NEW' }], key: 'ACTIVE', label: 'Active' },
      { name: 'converted + active', status: 'TRIAL_ATTENDED', lines: [{ status: 'JOINED' }, { status: 'TRIAL_SCHEDULED' }], key: 'ACTIVE_MIXED', label: 'Active · mixed outcomes' },
      { name: 'lost + active', status: 'NO_SHOW', lines: [{ status: 'LOST' }, { status: 'NEW' }], key: 'ACTIVE_MIXED', label: 'Active · mixed outcomes' },
      { name: 'converted + lost', status: 'TRIAL_ATTENDED', lines: [{ status: 'JOINED' }, { status: 'LOST' }], key: 'CLOSED_MIXED', label: 'Closed · mixed outcomes' },
      { name: 'converted + converted', status: 'JOINED', lines: [{ status: 'JOINED' }, { status: 'JOINED' }], key: 'JOINED', label: 'Joined' },
      { name: 'lost + lost', status: 'LOST', lines: [{ status: 'LOST' }, { status: 'LOST' }], key: 'LOST', label: 'Lost' },
      { name: 'converted + lost + active', status: 'TRIAL_ATTENDED', lines: [{ status: 'JOINED' }, { status: 'LOST' }, { status: 'CONTACTED' }], key: 'ACTIVE_MIXED', label: 'Active · mixed outcomes' },
      { name: 'converted + converted + lost', status: 'JOINED', lines: [{ status: 'JOINED' }, { status: 'JOINED' }, { status: 'LOST' }], key: 'CLOSED_MIXED', label: 'Closed · mixed outcomes' },
    ]

    for (const row of cases) {
      const result = display(row.status, row.lines)
      expect(result.key, row.name).toBe(row.key)
      expect(result.label, row.name).toBe(row.label)
    }
  })

  it('live households match the matrix after real lifecycle events', async () => {
    const testDb = await openTestDatabase()
    try {
      const newLead = await createSingleAdultHousehold(testDb.db, { firstName: 'MatrixNew' })
      expectHouseholdStatus(newLead, 'ACTIVE', 'Active')

      const scheduled = await createSingleAdultHousehold(testDb.db, { firstName: 'MatrixSched' })
      await scheduleValidTrialForLine(testDb.db, scheduled.id, scheduled.lines[0]!.id, 'ADULT_BJJ')
      expectHouseholdStatus(await getLead(testDb.db, scheduled.id), 'ACTIVE', 'Active')

      const mixed = await createParentChildHousehold(testDb.db, { parentFirstName: 'MatrixDad', childFirstName: 'MatrixKid' })
      await convertHouseholdLine(testDb.db, mixed.lines.find(line => line.relationship === 'SELF')!, undefined)
      expectHouseholdStatus(await getLead(testDb.db, mixed.id), 'ACTIVE_MIXED', 'Active · mixed outcomes')
      await markLineLost(testDb.db, mixed.lines.find(line => line.relationship === 'CHILD')!.id)
      const closed = await getLead(testDb.db, mixed.id)
      expectHouseholdStatus(closed, 'CLOSED_MIXED', 'Closed · mixed outcomes')
      expect((await listLeads(testDb.db, { status: 'CLOSED_MIXED' })).map(row => row.id)).toContain(closed.id)
      expect((await listLeads(testDb.db, { status: 'TRIAL_ATTENDED' })).map(row => row.id)).not.toContain(closed.id)
    } finally {
      await testDb.close()
    }
  })
})
