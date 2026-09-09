import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb, setUseDbForTests } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { environmentHeadline, listRegisteredEnvironments } from '../../server/services/registry'

const roots: string[] = []

afterEach(() => {
  setUseDbForTests(undefined)
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
})

describe('environments API payload', () => {
  it('lists Acme headlines without using container names as identity', async () => {
    const root = join(tmpdir(), `s3-api-${randomUUID()}`)
    mkdirSync(root, { recursive: true })
    roots.push(root)
    const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
    await migrateDatabase(url)
    await seedRegistry(url)
    const { client, db } = createDb(url)
    try {
      const rows = await listRegisteredEnvironments(db)
      const headlines = rows.map(row => environmentHeadline({
        customerDisplayName: row.customer.displayName,
        type: row.type,
      }))
      expect(headlines).toContain('Acme BJJ · PROD')
      expect(headlines).toContain('Acme BJJ · DEV')
      expect(headlines.join(' ')).not.toMatch(/lab-acme-prod-app/)
    } finally {
      client.close()
    }
  })
})
