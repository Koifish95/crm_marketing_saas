import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { customers, environments, hostingNodes } from '../../server/database/schema'
import { environmentNames } from '../../server/services/provision-contract'
import {
  addExtraNonProdEnvironment,
  addProductInstance,
  createCustomerAccount,
  insertNamedEnvironment,
} from '../../server/services/provision-registry'
import { decommissionEnvironment } from '../../server/services/decommission'
import { provisionCustomerEnvironments, setLifecycleStatus } from '../../server/services/provision-runtime'
import { listRegisteredEnvironments } from '../../server/services/registry'
import { UNASSIGNED_INDUSTRY } from '../../server/products/catalog'

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

async function openRegistry() {
  const root = join(tmpdir(), `s4-registry-${randomUUID()}`)
  mkdirSync(root, { recursive: true })
  roots.push(root)
  const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
  await migrateDatabase(url)
  await seedRegistry(url)
  return { url, root }
}

describe('S4 registry create', () => {
  it('creates an account with no environments and refuses a second slug', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerAccount(db, {
        displayName: 'Strategic Insights Consulting, LLC',
        slug: 'strategic-insights',
        timezone: 'America/Denver',
        adminEmail: 'admin@strategic-insights.local',
        filesRoot: root,
      })
      expect(created.environments).toHaveLength(0)
      const accounts = await db.select().from(customers)
      const si = accounts.find(account => account.slug === 'strategic-insights')
      expect(si?.industryTemplate).toBe(UNASSIGNED_INDUSTRY)
      expect((await listRegisteredEnvironments(db)).filter(env => env.customer.slug === 'strategic-insights')).toHaveLength(0)
      expect((await listRegisteredEnvironments(db)).filter(row => row.customer.slug === 'lab-acme')).toHaveLength(2)

      const second = await createCustomerAccount(db, {
        displayName: 'Strategic Insights Consulting, LLC',
        slug: 'strategic-insights',
        adminEmail: 'admin@strategic-insights.local',
        filesRoot: root,
      })
      expect(second.customerId).toBe(created.customerId)
      expect(second.resumed).toBe(true)

      const all = await db.select().from(environments)
      expect(all).toHaveLength(2)
    } finally {
      client.close()
    }
  })

  it('adds Martial Arts PROD and DEV only after an explicit product pick', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerAccount(db, {
        displayName: 'Nova BJJ',
        slug: 'nova-bjj',
        adminEmail: 'admin@nova.local',
        filesRoot: root,
      })
      const instance = await addProductInstance(db, created.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      expect(instance.environments).toHaveLength(2)
      expect(instance.environments.map(row => row.type).sort()).toEqual(['DEV', 'PROD'])
      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === created.customerId)
      expect(rows.every(row => row.expectedImage === 'martial-arts-acquisition:s4')).toBe(true)
      expect(rows.some(row => row.containerName === 'nova-bjj-martial-arts-prod-app')).toBe(true)
      expect(rows.every(row => row.productInstance.productId === 'martial-arts')).toBe(true)
      await expect(addProductInstance(db, created.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })).rejects.toThrow(/already/)
    } finally {
      client.close()
    }
  })

  it('refuses a second PROD for the same product instance', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerAccount(db, {
        displayName: 'Nova BJJ',
        slug: 'nova-bjj',
        adminEmail: 'admin@nova.local',
        filesRoot: root,
      })
      const instance = await addProductInstance(db, created.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      expect(instance.environments.filter(row => row.type === 'PROD')).toHaveLength(1)
      const [node] = await db.select().from(hostingNodes)
      const names = {
        ...environmentNames('nova-bjj', 'martial-arts', 'PROD'),
        slug: 'nova-bjj-martial-arts-prod-extra',
        containerName: 'nova-bjj-martial-arts-prod-extra-app',
        composeProject: 'nova-bjj-martial-arts-prod-extra',
        sqliteVolume: 'nova-bjj-martial-arts-prod-extra-sqlite',
        assetsVolume: 'nova-bjj-martial-arts-prod-extra-assets',
        isolationMarker: 'nova-bjj-martial-arts-prod-extra-isolation',
      }
      await expect(insertNamedEnvironment(db, {
        customer: {
          id: created.customerId,
          displayName: 'Nova BJJ',
          adminEmail: 'admin@nova.local',
          timezone: 'America/Denver',
        },
        productInstanceId: instance.productInstanceId,
        productId: 'martial-arts',
        nodeId: node!.id,
        names,
        hostPort: 52210,
        filesRoot: root,
      })).rejects.toThrow(/one PROD/)
    } finally {
      client.close()
    }
  })

  it('adds an extra named DEV without a second PROD', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerAccount(db, {
        displayName: 'Nova BJJ',
        slug: 'nova-bjj',
        adminEmail: 'admin@nova.local',
        filesRoot: root,
      })
      const instance = await addProductInstance(db, created.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      const extra = await addExtraNonProdEnvironment(db, instance.productInstanceId, {
        type: 'DEV',
        displayName: 'DEV-JOHN',
        filesRoot: root,
      })
      expect(extra.type).toBe('DEV')
      expect(extra.slug).toBe('nova-bjj-martial-arts-dev-john')
      expect(extra.hostPort).toBeGreaterThanOrEqual(52200)

      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.id === created.customerId)
      expect(rows).toHaveLength(3)
      expect(rows.filter(row => row.type === 'PROD')).toHaveLength(1)

      await expect(addExtraNonProdEnvironment(db, instance.productInstanceId, {
        type: 'PROD' as 'DEV',
        displayName: 'PROD-2',
        filesRoot: root,
      })).rejects.toThrow(/non-PROD|one PROD/)

      await expect(addExtraNonProdEnvironment(db, instance.productInstanceId, {
        type: 'DEV',
        displayName: 'DEV',
        filesRoot: root,
      })).rejects.toThrow(/already in use/)
    } finally {
      client.close()
    }
  })

  it('skips decommissioned environments on provision', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerAccount(db, {
        displayName: 'Nova BJJ',
        slug: 'nova-bjj',
        adminEmail: 'admin@nova.local',
        filesRoot: root,
      })
      const instance = await addProductInstance(db, created.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      for (const row of instance.environments) {
        await setLifecycleStatus(db, row.id, 'decommissioned')
      }
      await expect(provisionCustomerEnvironments(db, created.customerId, root)).rejects.toThrow(/No environments/)
      const already = await decommissionEnvironment(db, instance.environments[0]!.id)
      expect(already.lifecycleStatus).toBe('decommissioned')
      expect(already.args).toEqual([])
    } finally {
      client.close()
    }
  })

  it('refuses reserved slugs', async () => {
    const { url } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      await expect(createCustomerAccount(db, {
        displayName: 'Renzo',
        slug: 'renzo',
        adminEmail: 'admin@example.com',
      })).rejects.toThrow(/reserved/)
    } finally {
      client.close()
    }
  })
})
