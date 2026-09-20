import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { customers } from '../../server/database/schema'
import { createCustomerAccount } from '../../server/services/provision-registry'
import { deactivateCustomer, reactivateCustomer } from '../../server/services/account-lifecycle'
import { listOperatorEvents } from '../../server/services/operator-events'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
})

describe('customer deactivate/reactivate', () => {
  it('keeps the account row and records events', async () => {
    const root = join(tmpdir(), `cp-lifecycle-${randomUUID()}`)
    mkdirSync(root, { recursive: true })
    roots.push(root)
    const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
    await migrateDatabase(url)
    await seedRegistry(url)
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerAccount(db, {
        displayName: 'Archive QA LLC',
        slug: 'archive-qa',
        timezone: 'America/Denver',
        adminEmail: 'qa@archive.local',
        filesRoot: root,
      })
      const inactive = await deactivateCustomer(db, created.customerId, 'Cancelled dogfood')
      expect(inactive?.status).toBe('inactive')
      expect(inactive?.deactivatedNote).toBe('Cancelled dogfood')
      const accounts = await db.select().from(customers)
      expect(accounts.find(item => item.slug === 'archive-qa')?.status).toBe('inactive')
      const active = await reactivateCustomer(db, created.customerId)
      expect(active?.status).toBe('active')
      const events = await listOperatorEvents(db, { customerId: created.customerId })
      expect(events.map(item => item.action)).toEqual(['customer.reactivate', 'customer.deactivate'])
    } finally {
      client.close()
    }
  })
})
