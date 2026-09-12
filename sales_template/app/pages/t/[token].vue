<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
</script>

<template>
  <PublicIntakeForm :token="token" />
</template>
