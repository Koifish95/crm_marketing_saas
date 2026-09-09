import { createError, defineEventHandler, getQuery } from 'h3'
import { listLeadsQuerySchema } from '../../../shared/schemas/lead'
import { useDb } from '../../database'
import { listLeads } from '../../services/leads'
import { throwDomain } from '../../utils/api'
import { requireCrmAccessUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmAccessUser(event)
  const raw = getQuery(event)
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== undefined),
  )
  const parsed = listLeadsQuerySchema.safeParse(cleaned)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid lead filters.' })
  }
  try {
    return await listLeads(useDb(), parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
