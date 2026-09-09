export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()
  if (user.value?.role === 'ADMIN') {
    return
  }
  return navigateTo('/dashboard')
})
