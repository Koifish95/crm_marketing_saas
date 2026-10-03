export default defineNuxtRouteMiddleware(async () => {
  try {
    const status = await $fetch<{ enabled: boolean }>('/api/prospects/availability')
    if (!status.enabled) {
      return navigateTo('/dashboard')
    }
  } catch {
    return navigateTo('/dashboard')
  }
})
