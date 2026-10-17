import { createError, defineEventHandler, readBody } from 'h3'
import { approveProspects } from '../../services/prospects'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const body = await readBody<{ ids?: unknown }>(event)
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : []
  if (!ids.length || ids.some(id => !Number.isInteger(id) || id < 1)) {
    throw createError({ statusCode: 400, message: 'Send the academy ids to approve.' })
  }
  try {
    return await approveProspects(useDb(), ids, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
