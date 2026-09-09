import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { createDb } from '../../server/database'
import { environments } from '../../server/database/schema'
import { environmentHeadline, listRegisteredEnvironments } from '../../server/services/registry'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // Windows may hold a libsql lock briefly.
    }
  }
})

async function openRegistry() {
  const root = join(tmpdir(), `s3-registry-${randomUUID()}`)
  mkdirSync(root, { recursive: true })
  roots.push(root)
  const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
  await migrateDatabase(url)
  return url
}

describe('S3 registry', () => {
  it('seeds lab-acme once and keeps the same ids on a second setup', async () => {
    const url = await openRegistry()
    const first = await seedRegistry(url)
    const second = await seedRegistry(url)
    expect(second.customerId).toBe(first.customerId)
    expect(second.nodeId).toBe(first.nodeId)

    const { client, db } = createDb(url)
    try {
      const rows = await listRegisteredEnvironments(db)
      expect(rows).toHaveLength(2)
      expect(rows.map(row => row.slug).sort()).toEqual(['lab-acme-dev', 'lab-acme-prod'])
      expect(rows.every(row => row.customer.displayName === 'Acme BJJ')).toBe(true)
      expect(rows.every(row => row.node.name === 'laptop')).toBe(true)
      expect(rows.every(row => row.expectedImage === 'martial-arts-acquisition:s2')).toBe(true)
      expect(rows.some(row => row.containerName === 'lab-acme-prod-app')).toBe(true)
      const all = await db.select().from(environments)
      expect(all).toHaveLength(2)
    } finally {
      client.close()
    }
  })

  it('formats a human headline, not a container id', () => {
    expect(environmentHeadline({
      customerDisplayName: 'Acme BJJ',
      type: 'PROD',
      status: 'healthy',
    })).toBe('Acme BJJ · PROD · healthy')
  })
})
