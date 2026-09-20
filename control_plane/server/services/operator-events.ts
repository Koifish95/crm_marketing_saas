import { desc } from 'drizzle-orm'
import type { Database } from '../database'
import { operatorEvents } from '../database/schema'
import { createStableId } from '../../shared/utils/ids'

export async function recordOperatorEvent(db: Database, input: {
  action: string
  summary: string
  customerId?: string | null
  productInstanceId?: string | null
  environmentId?: string | null
  detail?: unknown
}) {
  const id = createStableId()
  await db.insert(operatorEvents).values({
    id,
    createdAt: new Date().toISOString(),
    action: input.action,
    customerId: input.customerId || null,
    productInstanceId: input.productInstanceId || null,
    environmentId: input.environmentId || null,
    summary: input.summary,
    detail: input.detail === undefined ? null : JSON.stringify(input.detail),
  })
  return id
}

export async function listOperatorEvents(db: Database, input: {
  customerId?: string
  environmentId?: string
  limit?: number
} = {}) {
  const rows = await db.select().from(operatorEvents).orderBy(desc(operatorEvents.createdAt))
  return rows
    .filter((row) => {
      if (input.customerId && row.customerId !== input.customerId) {
        return false
      }
      if (input.environmentId && row.environmentId !== input.environmentId) {
        return false
      }
      return true
    })
    .slice(0, input.limit ?? 50)
    .map(row => ({
      ...row,
      detail: row.detail ? safeJson(row.detail) : null,
    }))
}

function safeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
