import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { programs } from '../../server/database/schema'
import { createIntroRule, hasPublishedIntroAvailability } from '../../server/services/availability'
import { bookPublicHousehold } from '../../server/services/public-trial'
import { DomainError } from '../../server/services/errors'
import { openTestDatabase } from '../helpers/db'

describe('public /trial visibility', () => {
  it('is unpublished when no enabled intro rules exist', async () => {
    const testDb = await openTestDatabase({ fixtures: false })
    try {
      expect(await hasPublishedIntroAvailability(testDb.db)).toBe(false)
      await expect(bookPublicHousehold(testDb.db, {
        firstName: 'Pat',
        lastName: 'Lee',
        phone: '8015550100',
        members: [{
          relationship: 'SELF',
          firstName: 'Pat',
          lastName: 'Lee',
          programCode: 'ADULT_BJJ',
          slotId: 'rule:1:2026-09-14',
        }],
      })).rejects.toMatchObject({
        name: 'DomainError',
        statusCode: 404,
      })
    } finally {
      await testDb.close()
    }
  })

  it('becomes published after ADMIN adds an enabled intro rule', async () => {
    const testDb = await openTestDatabase({ fixtures: false })
    try {
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      expect(adult).toBeTruthy()
      await createIntroRule(testDb.db, {
        programId: adult!.id,
        weekday: 1,
        startMinute: 18 * 60,
        name: 'Adult Gi',
        enabled: true,
      })
      expect(await hasPublishedIntroAvailability(testDb.db)).toBe(true)
    } finally {
      await testDb.close()
    }
  })

  it('stays unpublished when the only rule is disabled', async () => {
    const testDb = await openTestDatabase({ fixtures: false })
    try {
      const [adult] = await testDb.db.select().from(programs).where(eq(programs.code, 'ADULT_BJJ'))
      await createIntroRule(testDb.db, {
        programId: adult!.id,
        weekday: 1,
        startMinute: 18 * 60,
        name: 'Adult Gi (draft)',
        enabled: false,
      })
      expect(await hasPublishedIntroAvailability(testDb.db)).toBe(false)
      await expect(bookPublicHousehold(testDb.db, {
        firstName: 'Pat',
        lastName: 'Lee',
        phone: '8015550100',
        members: [{
          relationship: 'SELF',
          firstName: 'Pat',
          lastName: 'Lee',
          programCode: 'ADULT_BJJ',
          slotId: 'rule:1:2026-09-14',
        }],
      })).rejects.toBeInstanceOf(DomainError)
    } finally {
      await testDb.close()
    }
  })
})
