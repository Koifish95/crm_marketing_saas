<script setup lang="ts">
import { nav } from '~~/shared/site'

const route = useRoute()
const open = ref(false)

watch(() => route.path, () => {
  open.value = false
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
    <SiteContainer class="flex h-16 items-center justify-between gap-4">
      <NuxtLink
        to="/"
        aria-label="Nuxxion home"
      >
        <SiteLogo />
      </NuxtLink>
      <nav
        class="hidden items-center gap-8 md:flex"
        aria-label="Primary"
      >
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="text-sm font-medium text-navy-800 hover:text-brand-700"
        >
          {{ item.label }}
        </NuxtLink>
        <PrimaryButton to="/demo">
          Request a Demo
        </PrimaryButton>
      </nav>
      <button
        type="button"
        class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line md:hidden"
        :aria-expanded="open"
        aria-controls="mobile-nav"
        @click="open = !open"
      >
        <span class="sr-only">{{ open ? 'Close menu' : 'Open menu' }}</span>
        <span
          aria-hidden="true"
          class="text-sm font-semibold text-navy-900"
        >{{ open ? 'Close' : 'Menu' }}</span>
      </button>
    </SiteContainer>
    <div
      v-if="open"
      id="mobile-nav"
      class="border-t border-line md:hidden"
    >
      <SiteContainer class="flex flex-col gap-1 py-3">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="min-h-11 py-2 text-base font-medium text-navy-900"
        >
          {{ item.label }}
        </NuxtLink>
        <PrimaryButton
          to="/demo"
          class="mt-2"
        >
          Request a Demo
        </PrimaryButton>
      </SiteContainer>
    </div>
  </header>
</template>
