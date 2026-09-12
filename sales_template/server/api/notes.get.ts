import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { listNotes } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'
import { NOTE_RECORD_KINDS } from '../../shared/utils/pipeline'

const querySchema = z.object({
  recordKind: z.enum(NOTE_RECORD_KINDS),
  recordId: z.coerce.number().int().positive(),
})

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid history filters.' })
  }
  try {
    return await listNotes(useDb(), parsed.data.recordKind, parsed.data.recordId)
  } catch (error) {
    throwDomain(error)
  }
})
