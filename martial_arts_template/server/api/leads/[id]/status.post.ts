import { changeLeadStatusSchema } from '../../../../shared/schemas/lead'
import { useDb } from '../../../database'
import { changeLeadStatus } from '../../../services/leads'
import { throwDomain } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  const parsed = changeLeadStatusSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid status change.' })
  }
  try {
    return await changeLeadStatus(useDb(), id, parsed.data, user)
  } catch (error) {
    throwDomain(error)
  }
})
