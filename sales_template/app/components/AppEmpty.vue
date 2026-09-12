<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  bare?: boolean
}>(), {
  bare: false,
})
</script>

<template>
  <div
    class="px-4 py-8 text-center"
    :class="bare ? '' : 'panel'"
  >
    <p class="font-medium text-navy-900">
      {{ title }}
    </p>
    <p
      v-if="description"
      class="mt-1 text-sm text-muted"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.default"
      class="mt-4"
    >
      <slot />
    </div>
  </div>
</template>
