<script setup lang="ts">
defineProps<{
  title: string
  crumbs?: { to?: string, label: string }[]
}>()
</script>

<template>
  <header class="page-header">
    <nav
      v-if="crumbs?.length"
      class="crumbs"
      aria-label="Breadcrumb"
    >
      <template
        v-for="(crumb, index) in crumbs"
        :key="`${crumb.label}-${index}`"
      >
        <NuxtLink
          v-if="crumb.to"
          :to="crumb.to"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-else>{{ crumb.label }}</span>
        <span
          v-if="index < crumbs.length - 1"
          class="muted"
        >/</span>
      </template>
    </nav>
    <div class="row">
      <h1>{{ title }}</h1>
      <slot name="actions" />
    </div>
    <p
      v-if="$slots.default"
      class="muted"
    >
      <slot />
    </p>
  </header>
</template>
