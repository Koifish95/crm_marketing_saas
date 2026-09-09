import { z } from 'zod'
import { useDb } from '../../../database'
import { addLeadNote } from '../../../services/leads'
import { throwDomain } from '../../../utils/api'

const bodySchema = z.object({
  body: z.string().min(1).max(8000),
})

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'A note is required.' })
  }
  try {
    return await addLeadNote(useDb(), id, parsed.data.body, user)
  } catch (error) {
    throwDomain(error)
  }
})
