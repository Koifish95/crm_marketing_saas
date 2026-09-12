import { createError, defineEventHandler, readBody } from 'h3'
import { createNoteSchema } from '../../shared/schemas/sales'
import { createNote } from '../services/sales'
import { useDb } from '../database'
import { throwDomain } from '../utils/api'
import { requireSalesAccess } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const parsed = createNoteSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid history note.' })
  }
  try {
    return await createNote(useDb(), {
      ...parsed.data,
      authorUserId: user.id,
    })
  } catch (error) {
    throwDomain(error)
  }
})
