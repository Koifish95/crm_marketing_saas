import { createError, defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '../../../../database'
import { approveContentItem } from '../../../../services/content'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'APPROVE_CONTENT')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid content.' })
  }
  try {
    return await approveContentItem(useDb(), id, actor)
  } catch (error) {
    throwDomain(error)
  }
})
