import { sql } from 'drizzle-orm'
import { coreHealthBody } from '@crm/core/shared/utils/health'
import { useDb } from '../database'

export const SALES_SCHEMA_VERSION = '0004_sales_v1_dogfood'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const db = useDb()
  await db.run(sql`select 1`)

  return coreHealthBody({
    appName: String(config.public.appName || ''),
    timezone: String(config.public.timezone || ''),
    database: 'reachable',
    schemaVersion: SALES_SCHEMA_VERSION,
  })
})
