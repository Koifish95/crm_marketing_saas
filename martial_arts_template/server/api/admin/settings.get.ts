import { defineEventHandler } from 'h3'
import { useDb } from '../../database'
import { getAppSettings } from '../../services/app-settings'
import { requireAdminUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  return getAppSettings(useDb())
})
