import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../database'
import { deleteIntroException } from '../../services/availability'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid exception id.' })
  }
  try {
    return await deleteIntroException(useDb(), id)
  } catch (error) {
    throwDomain(error)
  }
})
