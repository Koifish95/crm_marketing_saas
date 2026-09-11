import { sql } from 'drizzle-orm'
import { coreHealthBody } from '@crm/core/shared/utils/health'
import { useDb } from '../database'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const db = useDb()
  await db.run(sql`select 1`)

  return coreHealthBody({
    appName: String(config.public.appName || ''),
    timezone: String(config.public.timezone || ''),
    database: 'reachable',
  })
})
