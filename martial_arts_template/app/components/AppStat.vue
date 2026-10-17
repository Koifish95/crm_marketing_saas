<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  tone?: 'default' | 'danger' | 'warning' | 'success'
}>()

const toneClass: Record<string, string> = {
  default: 'text-ink',
  danger: 'text-danger-700',
  warning: 'text-warning-800',
  success: 'text-success-700',
}
</script>

<template>
  <div class="stat">
    <p class="stat-label">
      {{ label }}
    </p>
    <p
      class="stat-value"
      :class="toneClass[tone || 'default']"
    >
      <slot />
    </p>
    <p
      v-if="hint || $slots.hint"
      class="stat-hint"
    >
      <slot name="hint">
        {{ hint }}
      </slot>
    </p>
  </div>
</template>
