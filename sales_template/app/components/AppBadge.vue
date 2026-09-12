<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'muted'
}>(), {
  tone: 'neutral',
})

const toneClass: Record<string, string> = {
  neutral: 'bg-canvas text-navy-800 ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  success: 'bg-success-50 text-success-700 ring-emerald-100',
  warning: 'bg-warning-50 text-warning-800 ring-amber-100',
  danger: 'bg-danger-50 text-danger-700 ring-red-100',
  muted: 'bg-slate-100 text-muted ring-slate-200',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
    :class="toneClass[tone]"
  >
    <slot />
  </span>
</template>
