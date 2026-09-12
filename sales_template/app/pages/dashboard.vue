<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: 'auth',
})

useHead({
  title: 'Dashboard',
})

const { data, error, pending } = await useFetch('/api/dashboard')
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Dashboard"
      description="Open work in the Sales pipeline."
    />
    <AppAlert v-if="error">
      Could not load the dashboard. Refresh and try again.
    </AppAlert>
    <p
      v-else-if="pending && !data"
      class="text-sm text-muted"
    >
      Loading dashboard…
    </p>
    <div
      v-else
      class="grid gap-3 sm:grid-cols-3"
    >
      <NuxtLink
        to="/companies"
        class="panel p-4 hover:border-navy-600/30"
      >
        <p class="text-sm text-muted">Companies</p>
        <p class="mt-1 font-display text-2xl font-semibold">{{ data?.companies ?? 0 }}</p>
      </NuxtLink>
      <NuxtLink
        to="/contacts"
        class="panel p-4 hover:border-navy-600/30"
      >
        <p class="text-sm text-muted">Contacts</p>
        <p class="mt-1 font-display text-2xl font-semibold">{{ data?.contacts ?? 0 }}</p>
      </NuxtLink>
      <NuxtLink
        to="/opportunities"
        class="panel p-4 hover:border-navy-600/30"
      >
        <p class="text-sm text-muted">Open opportunities</p>
        <p class="mt-1 font-display text-2xl font-semibold">{{ data?.openOpportunities ?? 0 }}</p>
      </NuxtLink>
      <NuxtLink
        to="/opportunities"
        class="panel p-4 hover:border-navy-600/30"
      >
        <p class="text-sm text-muted">Won</p>
        <p class="mt-1 font-display text-2xl font-semibold">{{ data?.wonOpportunities ?? 0 }}</p>
      </NuxtLink>
      <NuxtLink
        to="/opportunities"
        class="panel p-4 hover:border-navy-600/30"
      >
        <p class="text-sm text-muted">Lost</p>
        <p class="mt-1 font-display text-2xl font-semibold">{{ data?.lostOpportunities ?? 0 }}</p>
      </NuxtLink>
      <NuxtLink
        to="/activities"
        class="panel p-4 hover:border-navy-600/30"
      >
        <p class="text-sm text-muted">Open activities</p>
        <p class="mt-1 font-display text-2xl font-semibold">{{ data?.openActivities ?? 0 }}</p>
      </NuxtLink>
    </div>
  </section>
</template>
