<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
  inverted?: boolean
  to?: string
}>(), {
  compact: false,
  inverted: false,
  to: '/',
})
</script>

<template>
  <NuxtLink
    :to="to"
    class="group block min-w-0"
  >
    <p
      class="text-[10px] font-semibold uppercase tracking-[0.22em]"
      :class="inverted ? 'text-brand-200' : 'text-brand-600'"
    >
      Renzo Gracie
    </p>
    <p
      class="font-display font-semibold tracking-tight"
      :class="[
        compact ? 'text-sm' : 'text-base',
        inverted ? 'text-white' : 'text-navy-900',
      ]"
    >
      Kaysville
    </p>
  </NuxtLink>
</template>
