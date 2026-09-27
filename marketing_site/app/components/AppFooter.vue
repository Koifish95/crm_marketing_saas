<script setup lang="ts">
import { companyLine } from '~~/shared/site'
</script>

<template>
  <footer class="border-t border-line bg-canvas">
    <SiteContainer class="grid gap-8 py-12 md:grid-cols-[1.4fr_1fr]">
      <div>
        <SiteLogo />
        <p class="mt-4 max-w-md text-sm leading-6 text-muted">
          Nuxxion Martial Arts is the acquisition CRM for trials, follow-up, and conversion.
        </p>
        <p class="mt-4 max-w-md text-sm leading-6 text-navy-800">
          {{ companyLine }}
        </p>
      </div>
      <nav
        aria-label="Footer"
        class="flex flex-col gap-2 text-sm"
      >
        <NuxtLink
          to="/product"
          class="min-h-11 py-2 text-navy-800 hover:text-brand-700 md:min-h-0 md:py-0"
        >Product</NuxtLink>
        <NuxtLink
          to="/how-it-works"
          class="min-h-11 py-2 text-navy-800 hover:text-brand-700 md:min-h-0 md:py-0"
        >How It Works</NuxtLink>
        <NuxtLink
          to="/about"
          class="min-h-11 py-2 text-navy-800 hover:text-brand-700 md:min-h-0 md:py-0"
        >About</NuxtLink>
        <NuxtLink
          to="/demo"
          class="min-h-11 py-2 text-navy-800 hover:text-brand-700 md:min-h-0 md:py-0"
        >Request a Demo</NuxtLink>
        <NuxtLink
          to="/privacy"
          class="min-h-11 py-2 text-navy-800 hover:text-brand-700 md:min-h-0 md:py-0"
        >Privacy</NuxtLink>
        <NuxtLink
          to="/terms"
          class="min-h-11 py-2 text-navy-800 hover:text-brand-700 md:min-h-0 md:py-0"
        >Terms</NuxtLink>
      </nav>
    </SiteContainer>
  </footer>
</template>
