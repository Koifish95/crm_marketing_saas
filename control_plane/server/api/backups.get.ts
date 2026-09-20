import { desc } from 'drizzle-orm'
import { useDb } from '../database'
import { environmentBackups } from '../database/schema'
import { listRegisteredEnvironments } from '../services/registry'
import { summarizeBackup } from '../services/fleet-backup'
import { existsSync } from 'node:fs'

export default defineEventHandler(async () => {
  const db = useDb()
  const fleet = await listRegisteredEnvironments(db)
  const byId = new Map(fleet.map(row => [row.id, row]))
  const rows = await db.select().from(environmentBackups).orderBy(desc(environmentBackups.createdAt))
  return {
    backups: rows.map((row) => {
      const env = byId.get(row.environmentId)
      return {
        ...summarizeBackup(row),
        available: existsSync(row.zipPath),
        environment: env
          ? {
              id: env.id,
              slug: env.slug,
              displayName: env.displayName,
              type: env.type,
              lifecycleStatus: env.lifecycleStatus,
              customer: env.customer.displayName,
              timezone: env.customer.timezone,
              product: env.productInstance.displayName,
            }
          : null,
      }
    }),
  }
})
