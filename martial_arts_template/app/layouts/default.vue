<script setup lang="ts">
const config = useRuntimeConfig()
const footerBrand = computed(() => {
  const name = String(config.public.brandName || 'Martial Arts')
  const location = String(config.public.brandLocation || 'Academy')
  return `${name} · ${location}`
})
const route = useRoute()
const isTrial = computed(() => route.path === '/trial')
const isEvent = computed(() => route.path.startsWith('/events/'))
const isTracking = computed(() => route.path === '/t' || route.path.startsWith('/t/'))
const hidePublicCta = computed(() => isTrial.value || isEvent.value || isTracking.value)
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink">
    <AppEnvBanner />
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2"
    >
      Skip to content
    </a>
    <header class="bg-navy-900 text-white">
      <div class="page-width flex items-center justify-between gap-4 py-4">
        <AppBrandMark inverted />
        <nav class="flex flex-wrap items-center gap-3 text-sm">
          <NuxtLink
            v-if="!hidePublicCta"
            to="/trial"
            class="rounded-md bg-white px-3 py-2 font-medium text-navy-900 hover:bg-brand-50"
          >
            Book a free class
          </NuxtLink>
          <NuxtLink
            v-if="!hidePublicCta"
            to="/login"
            class="text-white/75 hover:text-white"
          >
            Staff login
          </NuxtLink>
        </nav>
      </div>
    </header>
    <main
      id="main"
      class="page-width py-8 sm:py-10"
    >
      <slot />
    </main>
    <footer class="border-t border-line py-6 text-center text-xs text-muted">
      {{ footerBrand }}
    </footer>
  </div>
</template>
