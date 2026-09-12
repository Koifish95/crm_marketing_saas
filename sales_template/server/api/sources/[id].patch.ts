import { createError, defineEventHandler, readBody } from 'h3'
import { patchSourceSchema } from '../../../shared/schemas/sales'
import { updateSource } from '../../services/acquisition'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid source id.' })
  }
  const parsed = patchSourceSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Invalid source.' })
  }
  try {
    return await updateSource(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
