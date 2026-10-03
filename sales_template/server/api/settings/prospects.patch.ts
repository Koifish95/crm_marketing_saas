import { createError, defineEventHandler, readBody } from 'h3'
import { useDb } from '../../database'
import { writeProspectDeskConfig } from '../../services/prospect-desk-settings'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'
import type { ProspectDeskConfig } from '../../../shared/utils/prospect-desk'

export default defineEventHandler(async (event) => {
  const user = await requireSalesAccess(event, 'MANAGE_SALES')
  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Invalid prospect settings.' })
  }
  try {
    return await writeProspectDeskConfig(useDb(), body as Partial<ProspectDeskConfig>, user.id)
  } catch (error) {
    throwDomain(error)
  }
})
