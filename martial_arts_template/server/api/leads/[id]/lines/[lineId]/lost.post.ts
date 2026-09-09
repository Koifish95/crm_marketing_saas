import { markLeadLineLostSchema } from '../../../../../../shared/schemas/lead'
import { useDb } from '../../../../../database'
import { markLeadLineLost } from '../../../../../services/conversion'
import { getLead } from '../../../../../services/leads'
import { throwDomain } from '../../../../../utils/api'
import { requireCrmWriteUser } from '../../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const lineId = Number(getRouterParam(event, 'lineId'))
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(lineId) || lineId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid id.' })
  }
  const parsed = markLeadLineLostSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid lost outcome.' })
  }
  try {
    await markLeadLineLost(useDb(), lineId, parsed.data, user)
    const lead = await getLead(useDb(), id)
    if (!lead.lines.some(line => line.id === lineId)) {
      throw createError({ statusCode: 404, message: 'Prospective member not found.' })
    }
    return lead
  } catch (error) {
    throwDomain(error)
  }
})
