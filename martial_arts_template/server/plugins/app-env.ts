import { readAppEnv } from '../../shared/utils/app-env'

export default defineNitroPlugin(() => {
  const appEnv = readAppEnv()
  const publicEnv = String(useRuntimeConfig().public.appEnv || '')
  if (publicEnv && publicEnv !== appEnv) {
    console.warn(`[martial-arts] NUXT_PUBLIC_APP_ENV=${publicEnv} does not match APP_ENV=${appEnv}`)
  }
  console.info(`[martial-arts] APP_ENV=${appEnv}`)
})
