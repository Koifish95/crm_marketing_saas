import type { Database } from '../database'
import { DomainError } from './errors'

export async function runTransaction<T>(db: Database, work: (tx: Database) => Promise<T>): Promise<T> {
  if (typeof db.transaction !== 'function') {
    throw new DomainError('This action is temporarily unavailable.', 500)
  }
  return db.transaction(async (tx) => {
    return work(tx as unknown as Database)
  })
}
