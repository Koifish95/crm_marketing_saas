<script setup lang="ts">
import { formatBackupCreatedAt, formatBackupSize } from '~~/shared/utils/fleet-backup'

useHead({ title: 'Backups' })

const { data, error, pending, refresh } = await useFetch<{
  backups: {
    id: string
    createdAt: string
    bytes: number
    zipPath: string
    offhostPath?: string | null
    available: boolean
    environment: {
      id: string
      slug: string
      displayName: string
      type: string
      lifecycleStatus: string
      customer: string
      timezone?: string
      product: string
    } | null
  }[]
}>('/api/backups')
</script>

<template>
  <main class="page">
    <AppPageHeader title="Backups">
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="pending"
          @refresh="refresh"
        />
      </template>
      Same-host zips retained 14 days. Off-host copies are recorded when the operator copies them.
    </AppPageHeader>
    <AppAsyncPanel
      :pending="pending"
      :error="error"
      :empty="!data?.backups?.length"
      empty-message="No backups recorded."
    >
      <AppDataTable
        label="Fleet backups"
        :columns="['When', 'Customer', 'Product', 'Environment', 'Size', 'Off-host', 'Available']"
      >
        <tr
          v-for="backup in data?.backups"
          :key="backup.id"
        >
          <td>{{ formatBackupCreatedAt(backup.createdAt, backup.environment?.timezone || 'UTC') }}</td>
          <td>{{ backup.environment?.customer || '—' }}</td>
          <td>{{ backup.environment?.product || '—' }}</td>
          <td>
            <NuxtLink
              v-if="backup.environment"
              :to="`/environments/${backup.environment.id}`"
            >
              {{ backup.environment.displayName }} ({{ backup.environment.type }})
            </NuxtLink>
            <span v-else>{{ backup.id }}</span>
          </td>
          <td>{{ formatBackupSize(backup.bytes) }}</td>
          <td>{{ backup.offhostPath || 'not copied' }}</td>
          <td>{{ backup.available ? 'yes' : 'missing file' }}</td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
