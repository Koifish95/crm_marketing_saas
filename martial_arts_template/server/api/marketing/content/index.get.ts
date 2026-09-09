import { createError, defineEventHandler, getQuery } from 'h3'
import { listContentQuerySchema } from '../../../../shared/schemas/content'
import { useDb } from '../../../database'
import { listContentItems } from '../../../services/content'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAccessRight(event, 'VIEW_MARKETING')
  const raw = getQuery(event)
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined),
  )
  const parsed = listContentQuerySchema.safeParse(cleaned)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid content filters.' })
  }
  return listContentItems(useDb(), parsed.data)
})
