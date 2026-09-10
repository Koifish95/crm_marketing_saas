<script setup lang="ts">
defineProps<{
  href?: string
}>()
</script>

<template>
  <span
    v-if="href"
    class="access"
  >
    <a
      :href="href"
      target="_blank"
      rel="noreferrer"
    >Open</a>
    <span class="muted">{{ href }}</span>
  </span>
  <span
    v-else
    class="muted"
  >—</span>
</template>
