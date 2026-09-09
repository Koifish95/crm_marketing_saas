import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateLeadLineSchema } from '../../../../../shared/schemas/lead'
import { useDb } from '../../../../database'
import { updateLeadLine } from '../../../../services/lead-lines'
import { getLead } from '../../../../services/leads'
import { throwDomain } from '../../../../utils/api'
import { requireCrmWriteUser } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const lineId = Number(getRouterParam(event, 'lineId'))
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(lineId) || lineId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid id.' })
  }
  const parsed = updateLeadLineSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid prospective member.' })
  }
  try {
    const line = await updateLeadLine(useDb(), lineId, parsed.data)
    if (line.leadId !== id) {
      throw createError({ statusCode: 404, message: 'Prospective member not found.' })
    }
    return await getLead(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
