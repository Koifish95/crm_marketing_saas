<script setup lang="ts">
defineProps<{
  src: string
  alt: string
  caption?: string
}>()
</script>

<template>
  <figure>
    <BrowserFrame
      :src="src"
      :alt="alt"
    />
    <figcaption
      v-if="caption"
      class="mt-3 text-sm leading-6 text-muted"
    >
      {{ caption }}
    </figcaption>
  </figure>
</template>
