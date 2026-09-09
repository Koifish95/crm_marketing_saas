<script setup lang="ts">
defineProps<{
  status: string
}>()
</script>

<template>
  <span :class="['status', `status-${status}`]">{{ status }}</span>
</template>
