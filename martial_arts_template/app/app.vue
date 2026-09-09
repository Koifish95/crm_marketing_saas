<script setup lang="ts">
const config = useRuntimeConfig()
const appEnv = computed(() => String(config.public.appEnv || 'dev'))

useHead({
  htmlAttrs: {
    'lang': 'en',
    'data-app-env': appEnv,
  },
  titleTemplate: (title?: string) => {
    return title ? `${title} · Renzo Gracie Kaysville` : 'Renzo Gracie Kaysville'
  },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
