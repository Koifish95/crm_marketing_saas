import { createError } from 'h3'

export function requirePositiveId(value: string | undefined, label: string) {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: `Invalid ${label}.` })
  }
  return id
}
