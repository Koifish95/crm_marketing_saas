<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  text?: string
}>()
</script>

<template>
  <div class="max-w-2xl">
    <p
      v-if="eyebrow"
      class="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700"
    >
      {{ eyebrow }}
    </p>
    <h2 class="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
      {{ title }}
    </h2>
    <p
      v-if="text"
      class="mt-4 text-lg leading-8 text-muted"
    >
      {{ text }}
    </p>
  </div>
</template>
