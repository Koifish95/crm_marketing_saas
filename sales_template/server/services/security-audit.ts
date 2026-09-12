import { desc } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'
import type { Database } from '../database'
import { securityEvents, users } from '../database/schema'
import { utcNowMs } from '../../shared/utils/time'

export type SecurityAction
  = | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'USER_CREATED'
    | 'PASSWORD_CHANGED'

export type SecurityResult = 'SUCCESS' | 'FAILURE' | 'DENIED'

export function requestAuditContext(event: H3Event) {
  const forwarded = event.node.req.headers['x-forwarded-for']
  const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined
  const ip = getRequestIP(event, { xForwardedFor: true }) || forwardedIp || event.node.req.socket?.remoteAddress || null
  const header = event.node.req.headers['user-agent']
  const userAgent = typeof header === 'string' ? header.slice(0, 500) : null
  return { ip, userAgent }
}

export async function recordSecurityEvent(
  db: Database,
  input: {
    action: SecurityAction
    result: SecurityResult
    actorUserId?: number | null
    targetUserId?: number | null
    ip?: string | null
    userAgent?: string | null
    metadata?: Record<string, unknown> | null
  },
) {
  const metadata = input.metadata ? JSON.stringify(sanitizeMetadata(input.metadata)) : null
  await db.insert(securityEvents).values({
    createdAt: new Date(utcNowMs()),
    action: input.action,
    result: input.result,
    actorUserId: input.actorUserId ?? null,
    targetUserId: input.targetUserId ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    metadata,
  })
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (/password|secret|hash|token|session/i.test(key)) {
      continue
    }
    safe[key] = value
  }
  return safe
}

export async function listSecurityEvents(
  db: Database,
  filters: { search?: string, action?: string, result?: SecurityResult } = {},
) {
  const events = await db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt))
  const people = await db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
  }).from(users)
  const byId = new Map(people.map(person => [person.id, person]))

  return events.filter((row) => {
    if (filters.action && row.action !== filters.action) {
      return false
    }
    if (filters.result && row.result !== filters.result) {
      return false
    }
    const actor = row.actorUserId != null ? byId.get(row.actorUserId) : undefined
    const target = row.targetUserId != null ? byId.get(row.targetUserId) : undefined
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = [row.action, actor?.displayName, actor?.email, target?.displayName, target?.email, row.ip]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) {
        return false
      }
    }
    return true
  }).map((row) => {
    const actor = row.actorUserId != null ? byId.get(row.actorUserId) : undefined
    const target = row.targetUserId != null ? byId.get(row.targetUserId) : undefined
    return {
      id: row.id,
      createdAt: row.createdAt,
      action: row.action,
      result: row.result,
      actorName: actor?.displayName ?? null,
      actorEmail: actor?.email ?? null,
      targetName: target?.displayName ?? null,
      targetEmail: target?.email ?? null,
      ip: row.ip,
      userAgent: row.userAgent,
    }
  })
}
