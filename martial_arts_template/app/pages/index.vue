<script setup lang="ts">
const config = useRuntimeConfig()
const brandName = computed(() => String(config.public.brandName || 'Martial Arts'))

useHead({
  title: 'Acquisition',
})
</script>

<template>
  <section class="mx-auto max-w-2xl space-y-8">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
        {{ brandName }}
      </p>
      <h1 class="mt-2 font-display text-3xl font-semibold tracking-tight text-navy-900">
        Acquisition
      </h1>
      <p class="mt-3 max-w-xl text-sm leading-6 text-muted">
        Book a free intro class. Staff can sign in separately.
      </p>
    </div>
    <NuxtLink
      to="/trial"
      class="panel block p-5 ring-1 ring-navy-900/10 hover:border-navy-600/40"
    >
      <p class="text-sm font-semibold text-navy-900">
        Book a free class
      </p>
      <p class="mt-1 text-sm text-muted">
        Adult and kids intros. No experience required.
      </p>
    </NuxtLink>
    <p class="text-sm text-muted">
      Work at the academy?
      <NuxtLink
        to="/login"
        class="font-medium text-brand-700 hover:text-brand-600"
      >
        Staff sign-in
      </NuxtLink>
    </p>
  </section>
</template>
