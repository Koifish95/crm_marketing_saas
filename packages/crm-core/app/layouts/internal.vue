<script setup lang="ts">
import { listNavItems } from '../../shared/utils/nav'
import { roleLabel } from '../../lib/role-label'

const { user, clear } = useUserSession()
const route = useRoute()
const navOpen = ref(false)

const { data: me, error: sessionError } = await useFetch<{
  user?: { id: number, displayName: string, role: string }
  accessRights?: string[]
}>('/api/auth/me')
if (sessionError.value) {
  await clear()
  await navigateTo('/login')
}

const currentUser = computed(() => me.value?.user ?? user.value)

const links = computed(() => listNavItems({
  role: currentUser.value?.role,
  accessRights: me.value?.accessRights,
}))

function isActive(match: string) {
  return route.path === match || route.path.startsWith(`${match}/`)
}

watch(() => route.fullPath, () => {
  navOpen.value = false
})

watch(navOpen, (open) => {
  if (!import.meta.client) {
    return
  }
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Session is cleared locally even if the request fails.
  }
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink lg:flex lg:flex-col">
    <AppEnvBanner />
    <div class="flex min-h-0 min-w-0 flex-1 lg:flex">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <div
        v-if="navOpen"
        class="fixed inset-0 z-40 bg-navy-950/50 lg:hidden"
        @click="navOpen = false"
      />

      <aside
        id="staff-nav"
        class="fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-navy-900 text-white transition-transform lg:static lg:translate-x-0"
        :class="navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      >
        <div class="border-b border-white/10 px-5 py-5">
          <AppBrandMark
            inverted
            compact
            to="/dashboard"
          />
          <p class="mt-2 text-xs text-white/55">
            Acquisition
          </p>
          <AppEnvSwitcher
            class="mt-3"
            inverted
          />
        </div>
        <nav
          class="flex flex-1 flex-col gap-1 p-3"
          aria-label="Staff"
        >
          <NuxtLink
            v-for="link in links"
            :key="link.id"
            :to="link.to"
            class="flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
            :class="isActive(link.match)
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:bg-white/5 hover:text-white'"
            :aria-current="isActive(link.match) ? 'page' : undefined"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <div class="border-t border-white/10 p-4">
          <p
            v-if="currentUser"
            class="truncate text-sm text-white"
          >
            {{ currentUser.displayName }}
          </p>
          <p
            v-if="currentUser"
            class="text-xs text-white/55"
          >
            {{ roleLabel(currentUser.role) }}
          </p>
          <NuxtLink
            to="/account"
            class="mt-3 block text-sm font-medium text-brand-200 hover:text-white"
          >
            Account
          </NuxtLink>
          <button
            type="button"
            class="mt-2 text-sm font-medium text-brand-200 hover:text-white"
            @click="logout"
          >
            Log out
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-30 border-b border-line bg-paper px-4 py-3 lg:hidden">
          <div class="flex items-center justify-between gap-3">
            <AppBrandMark
              compact
              to="/dashboard"
            />
            <button
              type="button"
              class="btn btn-secondary px-3"
              :aria-expanded="navOpen"
              aria-controls="staff-nav"
              @click="navOpen = !navOpen"
            >
              {{ navOpen ? 'Close' : 'Menu' }}
            </button>
          </div>
        </header>
        <main
          id="main"
          class="page-width py-6 sm:py-8"
        >
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
