import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import type { Database } from '../database'
import { publicBookingSubmissions } from '../database/schema'
import { utcNowMs } from '../../shared/utils/time'
import { DomainError } from './errors'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function resolveIdempotencyKey(value?: string, options?: { required?: boolean }) {
  const trimmed = value?.trim()
  if (!trimmed) {
    if (options?.required) {
      throw new DomainError('A submission key is required.')
    }
    return randomUUID()
  }
  if (!UUID_RE.test(trimmed)) {
    throw new DomainError('Invalid booking request.')
  }
  return trimmed
}

export async function loadSubmission(db: Database, key: string) {
  const [row] = await db.select().from(publicBookingSubmissions)
    .where(eq(publicBookingSubmissions.idempotencyKey, key))
    .limit(1)
  return row ?? null
}

export async function claimSubmission(db: Database, key: string, nowMs = utcNowMs()) {
  await db.insert(publicBookingSubmissions).values({
    idempotencyKey: key,
    createdAt: new Date(nowMs),
  })
}

export async function completeSubmission(
  db: Database,
  key: string,
  leadId: number,
  result: unknown,
) {
  await db.update(publicBookingSubmissions)
    .set({
      leadId,
      resultJson: JSON.stringify(result),
    })
    .where(eq(publicBookingSubmissions.idempotencyKey, key))
}

export async function waitForCompletedSubmission<T>(
  db: Database,
  key: string,
  parse: (row: { resultJson: string | null, leadId: number | null }) => T | null,
  retryMessage = 'That booking is still being saved. Please wait and try again.',
): Promise<T> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const row = await loadSubmission(db, key)
    const stored = row ? parse(row) : null
    if (stored) {
      return stored
    }
    await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)))
  }
  throw new DomainError(retryMessage)
}
