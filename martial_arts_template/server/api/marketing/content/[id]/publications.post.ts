import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { recordContentPublicationSchema } from '../../../../../shared/schemas/content'
import { useDb } from '../../../../database'
import { resolveEffectiveAccessRightsForUserId } from '../../../../services/access-rights'
import { recordContentPublication } from '../../../../services/content'
import { throwDomain } from '../../../../utils/api'
import { requireAccessRight } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAccessRight(event, 'MANAGE_CONTENT')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid content.' })
  }
  const parsed = recordContentPublicationSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid publication.' })
  }
  const rights = await resolveEffectiveAccessRightsForUserId(useDb(), actor.id)
  try {
    return await recordContentPublication(
      useDb(),
      id,
      parsed.data,
      actor,
      actor.role === 'ADMIN' || rights.includes('APPROVE_CONTENT'),
    )
  } catch (error) {
    throwDomain(error)
  }
})
