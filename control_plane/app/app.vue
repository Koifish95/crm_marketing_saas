<script setup lang="ts">
const config = useRuntimeConfig()

useHead({
  htmlAttrs: { lang: 'en' },
  titleTemplate: (title?: string) => {
    const name = String(config.public.appName || 'SaaS Control Plane')
    return title ? `${title} · ${name}` : name
  },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
