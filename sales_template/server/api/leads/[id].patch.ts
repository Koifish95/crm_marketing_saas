import { createError, defineEventHandler, readBody } from 'h3'
import { patchLeadSchema } from '../../../shared/schemas/sales'
import { updateLead } from '../../services/sales'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid lead id.' })
  }
  const parsed = patchLeadSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid lead.' })
  }
  try {
    return await updateLead(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
