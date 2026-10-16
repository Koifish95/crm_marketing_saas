import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import { migrateDatabase, migrationsFolder } from '../../server/database/migrate'

const QA_MIGRATION_AT = 1790992800000

describe('skipped migrations', () => {
  it('applies an older journal entry that a newer applied migration hid from drizzle', async () => {
    const root = join(tmpdir(), `cp-skipped-${randomUUID()}`)
    const url = `file:${join(root, 'cp.sqlite').replaceAll('\\', '/')}`
    try {
      expect(await migrateDatabase(url)).toEqual([])

      // Recreate the VPS state: 0009 applied, 0008 never applied.
      const qaTables = [...readFileSync(join(migrationsFolder(), '0008_qa_ticketing.sql'), 'utf8')
        .matchAll(/CREATE TABLE `(\w+)`/g)].map(match => match[1]!)
      expect(qaTables).toContain('qa_runs')
      const client = createClient({ url })
      await client.execute('PRAGMA foreign_keys = OFF')
      for (const table of [...qaTables].reverse()) {
        await client.execute(`DROP TABLE \`${table}\``)
      }
      await client.execute({ sql: 'DELETE FROM __drizzle_migrations WHERE created_at = ?', args: [QA_MIGRATION_AT] })
      client.close()

      expect(await migrateDatabase(url)).toEqual([QA_MIGRATION_AT])

      const check = createClient({ url })
      const tables = (await check.execute(`SELECT name FROM sqlite_master WHERE type = 'table'`)).rows.map(row => String(row.name))
      expect(tables).toEqual(expect.arrayContaining(qaTables))
      const rows = await check.execute({ sql: 'SELECT count(*) AS n FROM __drizzle_migrations WHERE created_at = ?', args: [QA_MIGRATION_AT] })
      expect(Number(rows.rows[0]!.n)).toBe(1)
      check.close()

      expect(await migrateDatabase(url)).toEqual([])
    } finally {
      try {
        rmSync(root, { recursive: true, force: true })
      } catch {
        // Windows can hold the sqlite file briefly after close.
      }
    }
  })
})
