export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (!config.public.analyticsEnabled) {
    return
  }
})
