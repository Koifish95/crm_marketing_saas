import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../database'
import { pauseProspect } from '../../../services/prospect-outreach'
import { getProspectDetail } from '../../../services/prospects'
import { throwDomain } from '../../../utils/api'
import { requireSalesAccess } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid prospect id.' })
  }
  try {
    const db = useDb()
    await pauseProspect(db, id)
    return getProspectDetail(db, id)
  } catch (error) {
    throwDomain(error)
  }
})
