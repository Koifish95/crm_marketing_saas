import { resolveEffectiveAccessRightsForUserId } from '@crm/core/server/services/access-rights'
import { useDb } from '../../database'
import { requireAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const accessRights = await resolveEffectiveAccessRightsForUserId(useDb(), user.id)
  return { user, accessRights }
})
