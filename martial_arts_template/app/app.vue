<script setup lang="ts">
const config = useRuntimeConfig()
const appEnv = computed(() => String(config.public.appEnv || 'dev'))

useHead({
  htmlAttrs: {
    'lang': 'en',
    'data-app-env': appEnv,
  },
  titleTemplate: (title?: string) => {
    const name = String(config.public.appName || 'Martial Arts Acquisition')
    return title ? `${title} · ${name}` : name
  },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
