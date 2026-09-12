import { createError, defineEventHandler, readBody } from 'h3'
import { patchTrackingLinkSchema } from '../../../shared/schemas/sales'
import { updateTrackingLink } from '../../services/acquisition'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid tracking link id.' })
  }
  const parsed = patchTrackingLinkSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid tracking link.' })
  }
  try {
    return await updateTrackingLink(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
