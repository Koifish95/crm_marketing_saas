import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { environments, hostingNodes } from '../../server/database/schema'
import { environmentNames } from '../../server/services/provision-contract'
import { createCustomerWithDefaultEnvironments, insertNamedEnvironment } from '../../server/services/provision-registry'
import { listRegisteredEnvironments } from '../../server/services/registry'

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
  it('creates PROD and DEV rows without Docker and refuses a second slug', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerWithDefaultEnvironments(db, {
        displayName: 'Strategic Insights Consulting, LLC',
        slug: 'strategic-insights',
        timezone: 'America/Denver',
        adminEmail: 'admin@strategic-insights.local',
        filesRoot: root,
      })
      expect(created.environments).toHaveLength(2)
      expect(created.environments.map(row => row.type).sort()).toEqual(['DEV', 'PROD'])
      expect(created.environments.every(row => row.hostPort >= 52200)).toBe(true)

      const rows = await listRegisteredEnvironments(db)
      const si = rows.filter(row => row.customer.slug === 'strategic-insights')
      expect(si).toHaveLength(2)
      expect(si.every(row => row.lifecycleStatus === 'provisioning')).toBe(true)
      expect(si.every(row => row.expectedImage === 'martial-arts-acquisition:s4')).toBe(true)
      expect(si.some(row => row.containerName === 'strategic-insights-prod-app')).toBe(true)
      expect(si.every(row => row.accessUrl === `http://localhost:${row.hostPort}`)).toBe(true)
      expect(si.every(row => !row.accessUrl.includes('/api/health'))).toBe(true)
      expect(si.every(row => row.healthUrl.endsWith('/api/health'))).toBe(true)
      expect(rows.filter(row => row.customer.slug === 'lab-acme')).toHaveLength(2)

      const second = await createCustomerWithDefaultEnvironments(db, {
        displayName: 'Strategic Insights Consulting, LLC',
        slug: 'strategic-insights',
        adminEmail: 'admin@strategic-insights.local',
        filesRoot: root,
      })
      expect(second.customerId).toBe(created.customerId)
      expect(second.resumed).toBe(true)

      const all = await db.select().from(environments)
      expect(all).toHaveLength(4)
    } finally {
      client.close()
    }
  })

  it('refuses a second PROD for the same customer', async () => {
    const { url, root } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      const created = await createCustomerWithDefaultEnvironments(db, {
        displayName: 'Nova BJJ',
        slug: 'nova-bjj',
        adminEmail: 'admin@nova.local',
        filesRoot: root,
      })
      expect(created.environments.filter(row => row.type === 'PROD')).toHaveLength(1)
      const [node] = await db.select().from(hostingNodes)
      const names = {
        ...environmentNames('nova-bjj', 'PROD'),
        slug: 'nova-bjj-prod-extra',
        containerName: 'nova-bjj-prod-extra-app',
        composeProject: 'nova-bjj-prod-extra',
        sqliteVolume: 'nova-bjj-prod-extra-sqlite',
        assetsVolume: 'nova-bjj-prod-extra-assets',
        isolationMarker: 'nova-bjj-prod-extra-isolation',
      }
      await expect(insertNamedEnvironment(db, {
        customer: {
          id: created.customerId,
          displayName: 'Nova BJJ',
          adminEmail: 'admin@nova.local',
          timezone: 'America/Denver',
        },
        nodeId: node!.id,
        names,
        hostPort: 52210,
        filesRoot: root,
      })).rejects.toThrow(/one PROD/)
    } finally {
      client.close()
    }
  })

  it('refuses reserved slugs', async () => {
    const { url } = await openRegistry()
    const { client, db } = createDb(url)
    try {
      await expect(createCustomerWithDefaultEnvironments(db, {
        displayName: 'Renzo',
        slug: 'renzo',
        adminEmail: 'admin@example.com',
      })).rejects.toThrow(/reserved/)
    } finally {
      client.close()
    }
  })
})
