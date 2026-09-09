import { updateLeadSchema } from '../../../shared/schemas/lead'
import { useDb } from '../../database'
import { updateLead } from '../../services/leads'
import { throwDomain } from '../../utils/api'

export default defineEventHandler(async (event) => {
  await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  const parsed = updateLeadSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid lead.' })
  }
  try {
    return await updateLead(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
