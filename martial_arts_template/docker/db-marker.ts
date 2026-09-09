import { createClient } from '@libsql/client'

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? 'file:/app/data/sqlite/app.sqlite'
  const [command, value] = process.argv.slice(2)
  const client = createClient({ url: databaseUrl })

  try {
    if (command === 'set' && value) {
      await client.execute({
        sql: 'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',
        args: ['m10a.isolation', value, Date.now()],
      })
    } else if (command === 'get') {
      const result = await client.execute('SELECT value FROM app_settings WHERE key = \'m10a.isolation\'')
      const row = result.rows[0] as { value?: string } | undefined
      process.stdout.write(`${row?.value ?? ''}\n`)
    } else if (command === 'checkpoint') {
      await client.execute('PRAGMA wal_checkpoint(TRUNCATE)')
      process.stdout.write('ok\n')
    } else {
      console.error('Usage: node docker/db-marker.cjs <set|get|checkpoint> [value]')
      process.exit(1)
    }
  } finally {
    client.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
