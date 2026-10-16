<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  error?: string
  required?: boolean
}>()
</script>

<template>
  <label class="block text-sm font-medium text-navy-800">
    <span>
      {{ label }}
      <span
        v-if="required"
        class="text-danger-700"
      >*</span>
    </span>
    <span class="mt-2 block">
      <slot />
    </span>
    <span
      v-if="hint"
      class="mt-1 block text-xs font-normal leading-5 text-muted"
    >{{ hint }}</span>
    <span
      v-if="error"
      class="mt-1 block text-xs font-normal leading-5 text-danger-700"
    >
      {{ error }}
    </span>
  </label>
</template>
