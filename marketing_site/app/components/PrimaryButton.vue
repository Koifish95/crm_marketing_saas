<script setup lang="ts">
defineProps<{
  to?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}>()
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type || 'button'"
    :disabled="disabled"
    class="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <slot />
  </button>
</template>
