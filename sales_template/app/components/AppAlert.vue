<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'danger' | 'warning' | 'success' | 'info'
}>(), {
  tone: 'danger',
})

const toneClass: Record<string, string> = {
  danger: 'border-red-200 bg-danger-50 text-danger-700',
  warning: 'border-amber-200 bg-warning-50 text-warning-800',
  success: 'border-emerald-200 bg-success-50 text-success-700',
  info: 'border-brand-100 bg-brand-50 text-navy-800',
}
</script>

<template>
  <p
    role="alert"
    class="rounded-md border px-3 py-2 text-sm"
    :class="toneClass[tone]"
  >
    <slot />
  </p>
</template>
