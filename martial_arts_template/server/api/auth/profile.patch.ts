import { createError, defineEventHandler, readBody } from 'h3'
import { changeOwnNameSchema } from '../../../shared/schemas/user'
import { useDb } from '../../database'
import { loadActiveUser } from '../../services/auth'
import { changeOwnName } from '../../services/users'
import { throwDomain } from '../../utils/api'
import { requireAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAuthUser(event)
  const parsed = changeOwnNameSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid name.' })
  }
  try {
    const updated = await changeOwnName(useDb(), actor.id, parsed.data.displayName)
    const current = await loadActiveUser(useDb(), actor.id)
    if (current) {
      await setUserSession(event, { user: current })
    }
    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      mustChangePassword: updated.mustChangePassword,
    }
  } catch (error) {
    throwDomain(error)
  }
})
