<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  padded?: boolean
}>()
</script>

<template>
  <section class="panel">
    <header
      v-if="title || $slots.actions"
      class="mx-4 flex flex-wrap items-start justify-between gap-3 border-b border-line py-4 sm:mx-6 sm:py-5 lg:mx-8"
    >
      <div class="min-w-0">
        <h2
          v-if="title"
          class="text-sm font-semibold text-navy-900"
        >
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="mt-0.5 max-w-3xl text-sm text-muted"
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
    <div
      class="p-4 sm:p-6 lg:p-8"
      :class="{ '!p-0': padded === false }"
    >
      <slot />
    </div>
  </section>
</template>
