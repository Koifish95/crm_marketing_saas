<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>()
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <p
        v-if="eyebrow"
        class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        {{ eyebrow }}
      </p>
      <h1 class="font-display text-2xl font-semibold tracking-tight text-navy-900">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-1 max-w-2xl text-sm text-muted"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
