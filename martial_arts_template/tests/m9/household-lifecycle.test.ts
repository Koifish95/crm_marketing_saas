import { describe, expect, it } from 'vitest'
import { trials } from '../../server/database/schema'
import { eq } from 'drizzle-orm'
import { addLeadLineToHousehold } from '../../server/services/lead-lines'
import { convertHouseholdLine, createParentChildHousehold, createSingleAdultHousehold, expectHouseholdStatus, markLineLost, programId, scheduleValidTrialForLine } from '../m8/helpers/scenarios'
import { getLead, setTrialOutcome } from '../../server/services/leads'
import { householdDisplayStatus } from '../../shared/utils/labels'
import { openTestDatabase } from '../helpers/db'

describe('M9 household aggregate status and terminal Trial outcomes', () => {
  it('maps all-nonterminal households to Active rather than a person operational status', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createSingleAdultHousehold(testDb.db, { firstName: 'OpenAdult' })
      expectHouseholdStatus(household, 'ACTIVE', 'Active')
      const scheduled = await scheduleValidTrialForLine(testDb.db, household.id, household.lines[0]!.id, 'ADULT_BJJ')
      expectHouseholdStatus(scheduled, 'ACTIVE', 'Active')
    } finally {
      await testDb.close()
    }
  })

  it('keeps Joined, Lost, Closed mixed, and Active mixed labels', async () => {
    const testDb = await openTestDatabase()
    try {
      const mixed = await createParentChildHousehold(testDb.db, { parentFirstName: 'MixDad', childFirstName: 'MixKid' })
      const parent = mixed.lines.find(line => line.relationship === 'SELF')!
      const child = mixed.lines.find(line => line.relationship === 'CHILD')!
      await convertHouseholdLine(testDb.db, parent)
      expectHouseholdStatus(await getLead(testDb.db, mixed.id), 'ACTIVE_MIXED', 'Active · mixed outcomes')
      await markLineLost(testDb.db, child.id)
      expectHouseholdStatus(await getLead(testDb.db, mixed.id), 'CLOSED_MIXED', 'Closed · mixed outcomes')

      const allJoined = await createParentChildHousehold(testDb.db, { parentFirstName: 'BothDad', childFirstName: 'BothKid' })
      await convertHouseholdLine(testDb.db, allJoined.lines.find(line => line.relationship === 'SELF')!)
      await convertHouseholdLine(testDb.db, allJoined.lines.find(line => line.relationship === 'CHILD')!)
      expectHouseholdStatus(await getLead(testDb.db, allJoined.id), 'JOINED', 'Joined')

      const allLost = await createParentChildHousehold(testDb.db, { parentFirstName: 'LostDad', childFirstName: 'LostKid' })
      await markLineLost(testDb.db, allLost.lines.find(line => line.relationship === 'SELF')!.id)
      await markLineLost(testDb.db, allLost.lines.find(line => line.relationship === 'CHILD')!.id)
      expectHouseholdStatus(await getLead(testDb.db, allLost.id), 'LOST', 'Lost')
    } finally {
      await testDb.close()
    }
  })

  it('keeps Lost + active as Active mixed and Joined + Lost + active as Active mixed', async () => {
    const testDb = await openTestDatabase()
    try {
      const lostActive = await createParentChildHousehold(testDb.db, { parentFirstName: 'LostDad', childFirstName: 'OpenKid' })
      await markLineLost(testDb.db, lostActive.lines.find(line => line.relationship === 'SELF')!.id)
      expectHouseholdStatus(await getLead(testDb.db, lostActive.id), 'ACTIVE_MIXED', 'Active · mixed outcomes')

      const three = await createParentChildHousehold(testDb.db, { parentFirstName: 'ThreeDad', childFirstName: 'ThreeKid' })
      const parent = three.lines.find(line => line.relationship === 'SELF')!
      const child = three.lines.find(line => line.relationship === 'CHILD')!
      await convertHouseholdLine(testDb.db, parent)
      await markLineLost(testDb.db, child.id)
      expectHouseholdStatus(await getLead(testDb.db, three.id), 'CLOSED_MIXED', 'Closed · mixed outcomes')

      const kids = await programId(testDb.db, 'KIDS_BJJ')
      await addLeadLineToHousehold(testDb.db, three.id, {
        relationship: 'CHILD',
        firstName: 'OpenKid',
        programId: kids,
      })
      expectHouseholdStatus(await getLead(testDb.db, three.id), 'ACTIVE_MIXED', 'Active · mixed outcomes')
    } finally {
      await testDb.close()
    }
  })

  it('does not reopen JOINED or LOST when a leftover Trial outcome is recorded', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createParentChildHousehold(testDb.db, { parentFirstName: 'TermDad', childFirstName: 'TermKid' })
      const parent = household.lines.find(line => line.relationship === 'SELF')!
      const child = household.lines.find(line => line.relationship === 'CHILD')!
      const parentScheduled = await scheduleValidTrialForLine(testDb.db, household.id, parent.id, 'ADULT_BJJ')
      const parentTrial = parentScheduled.trials.find(trial => trial.leadLineId === parent.id && trial.status === 'SCHEDULED')!
      const childScheduled = await scheduleValidTrialForLine(testDb.db, household.id, child.id, 'KIDS_BJJ')
      const childTrial = childScheduled.trials.find(trial => trial.leadLineId === child.id && trial.status === 'SCHEDULED')!
      await convertHouseholdLine(testDb.db, parent)
      await markLineLost(testDb.db, child.id)
      expectHouseholdStatus(await getLead(testDb.db, household.id), 'CLOSED_MIXED', 'Closed · mixed outcomes')

      const afterChild = await setTrialOutcome(testDb.db, childTrial.id, { status: 'NO_SHOW' })
      expect(afterChild.lines.find(line => line.id === parent.id)?.status).toBe('JOINED')
      expect(afterChild.lines.find(line => line.id === child.id)?.status).toBe('LOST')
      expectHouseholdStatus(afterChild, 'CLOSED_MIXED', 'Closed · mixed outcomes')

      const afterParent = await setTrialOutcome(testDb.db, parentTrial.id, { status: 'ATTENDED' })
      expect(afterParent.lines.find(line => line.id === parent.id)?.status).toBe('JOINED')
      expect(afterParent.lines.find(line => line.id === child.id)?.status).toBe('LOST')
      expectHouseholdStatus(afterParent, 'CLOSED_MIXED', 'Closed · mixed outcomes')
      const [lostTrial] = await testDb.db.select().from(trials).where(eq(trials.id, childTrial.id))
      const [joinedTrial] = await testDb.db.select().from(trials).where(eq(trials.id, parentTrial.id))
      expect(lostTrial?.status).toBe('NO_SHOW')
      expect(joinedTrial?.status).toBe('ATTENDED')
    } finally {
      await testDb.close()
    }
  })

  it('does not let an active person No-show collapse Active mixed into a household No-show label', async () => {
    const testDb = await openTestDatabase()
    try {
      const household = await createParentChildHousehold(testDb.db, { parentFirstName: 'KeepDad', childFirstName: 'KeepKid' })
      const parent = household.lines.find(line => line.relationship === 'SELF')!
      const child = household.lines.find(line => line.relationship === 'CHILD')!
      await convertHouseholdLine(testDb.db, parent)
      const scheduled = await scheduleValidTrialForLine(testDb.db, household.id, child.id, 'KIDS_BJJ')
      expectHouseholdStatus(scheduled, 'ACTIVE_MIXED', 'Active · mixed outcomes')
      const childTrial = scheduled.trials.find(trial => trial.leadLineId === child.id && trial.status === 'SCHEDULED')!
      const after = await setTrialOutcome(testDb.db, childTrial.id, { status: 'NO_SHOW' })
      expect(after.lines.find(line => line.id === parent.id)?.status).toBe('JOINED')
      expect(after.lines.find(line => line.id === child.id)?.status).toBe('NO_SHOW')
      expect(householdDisplayStatus(after).key).toBe('ACTIVE_MIXED')
      expect(householdDisplayStatus(after).label).toBe('Active · mixed outcomes')
    } finally {
      await testDb.close()
    }
  })
})
