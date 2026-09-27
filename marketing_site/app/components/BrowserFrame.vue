<script setup lang="ts">
defineProps<{
  src: string
  alt: string
}>()
</script>

<template>
  <figure class="overflow-hidden rounded-lg border border-line bg-paper shadow-[0_18px_50px_-28px_rgba(12,24,40,0.45)]">
    <div class="flex items-center gap-2 border-b border-line bg-canvas px-3 py-2">
      <span class="size-2.5 rounded-full bg-line" />
      <span class="size-2.5 rounded-full bg-line" />
      <span class="size-2.5 rounded-full bg-line" />
      <span class="ml-2 truncate text-xs text-muted">Nuxxion Martial Arts</span>
    </div>
    <img
      :src="src"
      :alt="alt"
      class="block w-full bg-canvas"
      width="1440"
      height="900"
    >
  </figure>
</template>
