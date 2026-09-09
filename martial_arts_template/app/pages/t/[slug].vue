<script setup lang="ts">
import { writePublicAttribution } from '#shared/utils/public-attribution'

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'Opening class booking',
})

interface PublicTrackingLink {
  destinationPath: string
  trackingCode: string
  campaign: string
  utmSource: string | null
  utmMedium: string | null
  utmContent: string | null
  utmTerm: string | null
}

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const { data, error } = await useFetch<PublicTrackingLink>(() => `/api/public/tracking/${encodeURIComponent(slug.value)}`)

if (import.meta.client && data.value && !error.value) {
  writePublicAttribution({
    trackingCode: data.value.trackingCode,
    campaign: data.value.campaign,
    utmSource: data.value.utmSource ?? undefined,
    utmMedium: data.value.utmMedium ?? undefined,
    utmContent: data.value.utmContent ?? undefined,
    utmTerm: data.value.utmTerm ?? undefined,
  })
  await navigateTo(data.value.destinationPath)
}
</script>

<template>
  <section class="mx-auto max-w-xl space-y-4">
    <AppAlert v-if="error">
      That link is not available.
    </AppAlert>
    <p
      v-else
      class="text-sm text-muted"
    >
      Opening the class booking page…
    </p>
  </section>
</template>
