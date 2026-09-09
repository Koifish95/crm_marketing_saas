<script setup lang="ts">
defineProps<{
  label?: string
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="search">
    {{ label || 'Search' }}
    <input
      v-model="model"
      type="search"
      :placeholder="label || 'Search'"
    >
  </label>
</template>
