import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateContentItemSchema } from '../../../../shared/schemas/content'
import { useDb } from '../../../database'
import { resolveEffectiveAccessRightsForUserId } from '../../../services/access-rights'
import { updateContentItem } from '../../../services/content'
import { throwDomain } from '../../../utils/api'
import { requireAccessRight } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_CONTENT')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid content.' })
  }
  const parsed = updateContentItemSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid content.' })
  }
  const rights = await resolveEffectiveAccessRightsForUserId(useDb(), actor.id)
  try {
    return await updateContentItem(useDb(), id, parsed.data, actor, actor.role === 'ADMIN' || rights.includes('APPROVE_CONTENT'))
  } catch (error) {
    throwDomain(error)
  }
})
