import { createError, defineEventHandler, readBody } from 'h3'
import { patchContactSchema } from '../../../shared/schemas/sales'
import { updateContact } from '../../services/sales'
import { useDb } from '../../database'
import { throwDomain } from '../../utils/api'
import { requireSalesAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSalesAccess(event, 'MANAGE_SALES')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid contact id.' })
  }
  const parsed = patchContactSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid contact.' })
  }
  try {
    return await updateContact(useDb(), id, parsed.data)
  } catch (error) {
    throwDomain(error)
  }
})
