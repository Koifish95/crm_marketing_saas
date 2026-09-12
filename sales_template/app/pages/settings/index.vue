<script setup lang="ts">
import { listSettingsSections } from '@crm/core/shared/utils/settings-registry'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Settings',
})

const sections = listSettingsSections()
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Settings"
      description="Core settings registry. Sales registers Access and Public intake."
    />
    <ul class="record-list">
      <li
        v-for="section in sections"
        :key="section.id"
        class="record-item"
      >
        <NuxtLink
          :to="section.to"
          class="record-item-title"
        >
          {{ section.title }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ section.description }}
        </p>
      </li>
    </ul>
  </section>
</template>
