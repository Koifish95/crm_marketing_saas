<script setup lang="ts">
defineProps<{
  loading?: boolean
}>()
</script>

<template>
  <section class="record-workspace">
    <div
      v-if="$slots.toolbar"
      class="record-toolbar"
    >
      <slot name="toolbar" />
    </div>
    <header
      v-if="$slots.header || $slots.actions"
      class="record-header"
    >
      <div class="record-header-body">
        <div class="min-w-0 flex-1">
          <slot name="header" />
        </div>
        <div
          v-if="$slots.actions"
          class="record-header-actions"
        >
          <slot name="actions" />
        </div>
      </div>
    </header>
    <p
      v-if="loading"
      class="text-sm text-muted"
    >
      Loading record…
    </p>
    <slot />
    <slot name="tabs" />
  </section>
</template>
