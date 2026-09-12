export default defineNuxtRouteMiddleware(() => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) {
    return
  }
  if (user.value?.mustChangePassword) {
    return navigateTo('/account/password')
  }
  return navigateTo('/dashboard')
})
