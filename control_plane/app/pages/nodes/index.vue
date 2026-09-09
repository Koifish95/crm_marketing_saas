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
        <button
          type="button"
          class="secondary"
          :disabled="pending || refreshing"
          @click="refreshStatus"
        >
          Refresh
        </button>
      </template>
      {{ summary.nodeCount }} nodes. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <AppSearchField v-model="query" />
    <p
      v-if="pending && !checkedAt"
      class="muted"
    >
      Loading…
    </p>
    <p
      v-else-if="error"
      class="muted"
    >
      Could not load the registry.
    </p>
    <p
      v-else-if="rows.length === 0"
      class="muted"
    >
      No hosting nodes match.
    </p>
    <table
      v-else
      class="data-table"
      aria-label="Hosting nodes"
    >
      <thead>
        <tr>
          <th>Name</th>
          <th>ID</th>
          <th>Kind</th>
          <th>Driver</th>
          <th>Environments</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
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
      </tbody>
    </table>
  </main>
</template>
