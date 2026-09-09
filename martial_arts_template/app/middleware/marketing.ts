export default defineNuxtRouteMiddleware(async (to) => {
  const { user } = useUserSession()
  if (!user.value) {
    return navigateTo('/login')
  }
  if (user.value.role === 'ADMIN') {
    return
  }
  try {
    const me = await $fetch<{ accessRights?: string[] }>('/api/auth/me')
    if (me.accessRights?.includes('VIEW_MARKETING')) {
      return
    }
  } catch {
    // Fall through to dashboard if the session cannot load Access Rights.
  }
  if (to.path === '/dashboard') {
    return
  }
  return navigateTo('/dashboard')
})
