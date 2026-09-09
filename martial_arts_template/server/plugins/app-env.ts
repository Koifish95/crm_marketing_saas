import { readAppEnv } from '../../shared/utils/app-env'

export default defineNitroPlugin(() => {
  const appEnv = readAppEnv()
  const publicEnv = String(useRuntimeConfig().public.appEnv || '')
  if (publicEnv && publicEnv !== appEnv) {
    console.warn(`[renzo] NUXT_PUBLIC_APP_ENV=${publicEnv} does not match APP_ENV=${appEnv}`)
  }
  console.info(`[renzo] APP_ENV=${appEnv}`)
})
