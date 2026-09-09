<script setup lang="ts">
defineProps<{
  pending?: boolean
  error?: unknown
  empty?: boolean
  errorMessage?: string
  emptyMessage?: string
}>()
</script>

<template>
  <p
    v-if="pending"
    class="muted"
  >
    Loading…
  </p>
  <p
    v-else-if="error"
    class="muted"
    role="status"
  >
    {{ errorMessage || 'Could not load the registry.' }}
  </p>
  <p
    v-else-if="empty"
    class="muted"
  >
    {{ emptyMessage || 'Nothing to show.' }}
  </p>
  <slot v-else />
</template>
