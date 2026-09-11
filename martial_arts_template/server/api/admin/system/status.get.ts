import { defineEventHandler } from 'h3'
import { publicBrand } from '@crm/core/shared/utils/brand'
import { readAppEnv } from '@crm/core/shared/utils/app-env'
import {
  isRestartEnabled,
  processUptimeSeconds,
  safeNodeEnv,
} from '../../../services/system'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  return {
    app: publicBrand().appName,
    timezone: process.env.NUXT_PUBLIC_TIMEZONE?.trim() || 'America/Denver',
    appEnv: readAppEnv(),
    nodeEnv: safeNodeEnv(),
    uptimeSeconds: processUptimeSeconds(),
    restartEnabled: isRestartEnabled(),
  }
})
