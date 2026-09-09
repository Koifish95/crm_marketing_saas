<script setup lang="ts">
defineProps<{
  pending?: boolean
  refreshing?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <button
    type="button"
    class="secondary"
    :disabled="pending || refreshing"
    :aria-busy="refreshing || false"
    @click="emit('refresh')"
  >
    Refresh
  </button>
</template>
