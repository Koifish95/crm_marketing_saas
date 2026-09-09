export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (user.value?.role === 'ADMIN' || user.value?.role === 'STAFF') {
    return
  }
  return navigateTo('/dashboard')
})
