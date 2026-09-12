import { readAppEnv } from '@crm/core/shared/utils/app-env'
import '../../shared/utils/access-rights'

export default defineNitroPlugin(() => {
  const appEnv = readAppEnv()
  const publicEnv = String(useRuntimeConfig().public.appEnv || '')
  if (publicEnv && publicEnv !== appEnv) {
    console.warn(`[sales-crm] NUXT_PUBLIC_APP_ENV=${publicEnv} does not match APP_ENV=${appEnv}`)
  }
  console.info(`[sales-crm] APP_ENV=${appEnv}`)
})
