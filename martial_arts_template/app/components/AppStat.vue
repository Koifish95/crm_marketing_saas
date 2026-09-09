<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
}>()

const toneClass: Record<string, string> = {
  default: 'text-navy-900',
  danger: 'text-danger-700',
  warning: 'text-warning-800',
  success: 'text-success-700',
}
</script>

<template>
  <div class="panel p-4 md:p-6">
    <p class="text-sm text-muted">
      {{ label }}
    </p>
    <p
      class="mt-1 font-display text-2xl font-semibold tracking-tight"
      :class="toneClass[tone || 'default']"
    >
      <slot />
    </p>
    <p
      v-if="hint || $slots.hint"
      class="mt-1 break-words text-sm text-muted"
    >
      <slot name="hint">
        {{ hint }}
      </slot>
    </p>
  </div>
</template>
