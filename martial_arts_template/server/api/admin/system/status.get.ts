import { defineEventHandler } from 'h3'
import { readAppEnv } from '../../../../shared/utils/app-env'
import {
  isRestartEnabled,
  processUptimeSeconds,
  safeNodeEnv,
} from '../../../services/system'
import { requireAdminUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  return {
    app: 'Renzo Gracie Kaysville Acquisition',
    timezone: process.env.NUXT_PUBLIC_TIMEZONE?.trim() || 'America/Denver',
    appEnv: readAppEnv(),
    nodeEnv: safeNodeEnv(),
    uptimeSeconds: processUptimeSeconds(),
    restartEnabled: isRestartEnabled(),
  }
})
