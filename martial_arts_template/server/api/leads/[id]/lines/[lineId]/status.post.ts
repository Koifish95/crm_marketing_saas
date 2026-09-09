import { changeLeadLineStatusSchema } from '../../../../../../shared/schemas/lead'
import { useDb } from '../../../../../database'
import { changeLeadLineStatus } from '../../../../../services/lead-lines'
import { getLead } from '../../../../../services/leads'
import { throwDomain } from '../../../../../utils/api'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const lineId = Number(getRouterParam(event, 'lineId'))
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(lineId) || lineId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid id.' })
  }
  const parsed = changeLeadLineStatusSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid status.' })
  }
  try {
    const line = await changeLeadLineStatus(useDb(), lineId, parsed.data, user)
    if (line.leadId !== id) {
      throw createError({ statusCode: 404, message: 'Prospective member not found.' })
    }
    return await getLead(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
