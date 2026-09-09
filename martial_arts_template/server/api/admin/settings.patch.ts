import { createError, defineEventHandler, readBody } from 'h3'
import { patchAppSettingsSchema } from '../../../shared/schemas/app-settings'
import { useDb } from '../../database'
import { updateAppSettings } from '../../services/app-settings'
import { requestAuditContext } from '../../services/security-audit'
import { throwDomain } from '../../utils/api'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  const parsed = patchAppSettingsSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid setting.' })
  }
  try {
    return await updateAppSettings(
      useDb(),
      parsed.data,
      user,
      requestAuditContext(event),
    )
  } catch (error) {
    throwDomain(error)
  }
})
