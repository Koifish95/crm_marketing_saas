<script setup lang="ts">
const config = useRuntimeConfig()
const appEnv = computed(() => String(config.public.appEnv || 'dev'))

useHead({
  htmlAttrs: {
    'data-app-env': appEnv,
  },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
