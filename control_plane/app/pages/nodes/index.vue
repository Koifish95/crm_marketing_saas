<script setup lang="ts">
import { filterByQuery } from '~~/shared/utils/fleet'

useHead({ title: 'Hosting Nodes' })

const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const query = ref('')
const rows = computed(() => filterByQuery(
  summary.value.nodes,
  query.value,
  row => `${row.name} ${row.kind} ${row.driver}`,
))
</script>

<template>
  <main class="page">
    <AppPageHeader title="Hosting Nodes">
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshStatus"
        />
      </template>
      {{ summary.nodeCount }} nodes. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <AppSearchField v-model="query" />
    <AppAsyncPanel
      :pending="pending && !checkedAt"
      :error="error"
      :empty="rows.length === 0"
      empty-message="No hosting nodes match."
    >
      <AppDataTable
        label="Hosting nodes"
        :columns="['Name', 'ID', 'Kind', 'Driver', 'Environments', 'Status']"
      >
        <tr
          v-for="node in rows"
          :key="node.id"
        >
          <td>
            <NuxtLink :to="`/nodes/${node.id}`">
              {{ node.name }}
            </NuxtLink>
          </td>
          <td>{{ node.id }}</td>
          <td>{{ node.kind }}</td>
          <td>{{ node.driver }}</td>
          <td>{{ node.environmentCount }}</td>
          <td><AppStatusBadge :status="node.overall" /></td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
