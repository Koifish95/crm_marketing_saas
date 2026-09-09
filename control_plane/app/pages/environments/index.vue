<script setup lang="ts">
import { filterByQuery } from '~~/shared/utils/fleet'

useHead({ title: 'Environments' })

const { error, pending, refreshing, environments, checkedAt, refreshStatus } = await useFleetStatus()
const query = ref('')
const typeFilter = ref('')
const rows = computed(() => {
  const filtered = typeFilter.value
    ? environments.value.filter(env => env.type === typeFilter.value)
    : environments.value
  return filterByQuery(filtered, query.value, env => `${env.customer.displayName} ${env.slug} ${env.type} ${env.node.name}`)
})
</script>

<template>
  <main class="page">
    <AppPageHeader title="Environments">
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
      {{ environments.length }} environments. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <div class="row">
      <AppSearchField v-model="query" />
      <label>
        Type
        <select v-model="typeFilter">
          <option value="">
            All
          </option>
          <option value="PROD">
            PROD
          </option>
          <option value="DEV">
            DEV
          </option>
        </select>
      </label>
    </div>
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
      No environments match.
    </p>
    <table
      v-else
      class="data-table"
      aria-label="Environments"
    >
      <thead>
        <tr>
          <th>Customer</th>
          <th>Environment</th>
          <th>Type</th>
          <th>Node</th>
          <th>Runtime</th>
          <th>Health</th>
          <th>Image</th>
          <th>Last checked</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="env in rows"
          :key="env.id"
        >
          <td>
            <NuxtLink :to="`/customers/${env.customer.id}`">
              {{ env.customer.displayName }}
            </NuxtLink>
          </td>
          <td>
            <NuxtLink :to="`/environments/${env.id}`">
              {{ env.displayName }}
            </NuxtLink>
          </td>
          <td>{{ env.type }}</td>
          <td>
            <NuxtLink :to="`/nodes/${env.node.id}`">
              {{ env.node.name }}
            </NuxtLink>
          </td>
          <td>{{ env.runtime }}</td>
          <td><AppStatusBadge :status="env.status" /></td>
          <td>{{ env.expectedImage }}</td>
          <td>{{ checkedAt || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </main>
</template>
