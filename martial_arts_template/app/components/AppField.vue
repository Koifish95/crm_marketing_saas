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
    <span class="flex items-baseline justify-between gap-2">
      <span>
        {{ label }}
        <span
          v-if="required"
          class="text-danger-700"
        >*</span>
      </span>
      <span
        v-if="hint"
        class="font-normal text-muted"
      >{{ hint }}</span>
    </span>
    <span class="mt-1.5 block">
      <slot />
    </span>
    <span
      v-if="error"
      class="mt-1 block text-xs font-normal text-danger-700"
    >
      {{ error }}
    </span>
  </label>
</template>
