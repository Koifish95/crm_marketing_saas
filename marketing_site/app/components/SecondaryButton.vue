<script setup lang="ts">
defineProps<{
  to?: string
}>()
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-paper px-5 text-sm font-semibold text-navy-900 hover:bg-canvas"
  >
    <slot />
  </NuxtLink>
  <a
    v-else
    class="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-paper px-5 text-sm font-semibold text-navy-900 hover:bg-canvas"
  >
    <slot />
  </a>
</template>
