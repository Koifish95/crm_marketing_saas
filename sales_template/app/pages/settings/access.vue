<script setup lang="ts">
import { listRegisteredAccessRights } from '@crm/core/shared/utils/permission-catalog'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Access',
})

const rights = listRegisteredAccessRights()
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Access"
      description="Sales-owned Access Rights registered on the Core catalog."
    />
    <ul class="record-list">
      <li
        v-for="right in rights"
        :key="right.code"
        class="record-item"
      >
        <p class="record-item-title">
          {{ right.label }}
        </p>
        <p class="record-item-meta">
          {{ right.code }}{{ right.description ? ` — ${right.description}` : '' }}
        </p>
      </li>
    </ul>
  </section>
</template>
