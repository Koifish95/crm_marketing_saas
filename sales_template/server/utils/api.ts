import { createError } from 'h3'
import { toDomainHttpError } from '@crm/core/server/services/errors'

export function throwDomain(error: unknown): never {
  const mapped = toDomainHttpError(error)
  if (mapped) {
    throw createError(mapped)
  }
  throw error
}
