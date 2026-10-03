import { createError, defineEventHandler, readBody } from 'h3'
import { useDb } from '../../database'
import { startProspectDiscovery } from '../../services/prospect-runs'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const body = await readBody(event) as { state?: string }
  if (!body?.state?.trim()) {
    throw createError({ statusCode: 400, message: 'Choose a state.' })
  }
  try {
    return await startProspectDiscovery(useDb(), body.state)
  } catch (error) {
    throwDomain(error)
  }
})
