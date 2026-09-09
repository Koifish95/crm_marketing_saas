<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="field-group">
    <h3 class="field-group-title">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="text-sm text-muted"
    >
      {{ description }}
    </p>
    <div class="field-group-fields">
      <slot />
    </div>
  </section>
</template>
