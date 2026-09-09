export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''
  return code.includes('SQLITE_CONSTRAINT')
    || /UNIQUE constraint failed/i.test(message)
    || /unique constraint/i.test(message)
}

export function isSqliteBusyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''
  return code.includes('SQLITE_BUSY')
    || /database is locked/i.test(message)
}

export function isIdempotencyKeyConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /public_booking_submissions/i.test(message)
    && /idempotency_key/i.test(message)
    && isUniqueConstraintError(error)
}
