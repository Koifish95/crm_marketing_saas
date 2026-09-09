import { useDb } from '../../../../database'
import { removeLeadLine } from '../../../../services/lead-lines'
import { getLead } from '../../../../services/leads'
import { throwDomain } from '../../../../utils/api'

export default defineEventHandler(async (event) => {
  await requireCrmWriteUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const lineId = Number(getRouterParam(event, 'lineId'))
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(lineId) || lineId < 1) {
    throw createError({ statusCode: 400, message: 'Invalid id.' })
  }
  try {
    await removeLeadLine(useDb(), lineId)
    return await getLead(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
