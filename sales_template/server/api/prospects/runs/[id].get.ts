import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../database'
import { getProspectRun } from '../../../services/prospect-runs'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'VIEW_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid discovery run.' })
  }
  try {
    const run = await getProspectRun(useDb(), id)
    if (!run) {
      throw createError({ statusCode: 404, message: 'Discovery run not found.' })
    }
    return run
  } catch (error) {
    throwDomain(error)
  }
})
