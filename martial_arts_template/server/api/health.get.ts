import { sql } from 'drizzle-orm'
import { readAppEnv } from '../../shared/utils/app-env'
import { useDb } from '../database'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const db = useDb()
  await db.run(sql`select 1`)

  return {
    ok: true,
    app: config.public.appName,
    timezone: config.public.timezone,
    database: 'reachable' as const,
    appEnv: readAppEnv(),
  }
})
