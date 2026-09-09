<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

await navigateTo('/marketing/campaigns', { replace: true })
</script>

<template>
  <p class="text-sm text-muted">
    Campaign planning moved to Marketing.
  </p>
</template>
