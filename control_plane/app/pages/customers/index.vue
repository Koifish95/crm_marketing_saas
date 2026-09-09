<script setup lang="ts">
import { filterByQuery } from '~~/shared/utils/fleet'

useHead({ title: 'Customers' })

const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const query = ref('')
const rows = computed(() => filterByQuery(
  summary.value.customers,
  query.value,
  row => `${row.displayName} ${row.slug}`,
))
</script>

<template>
  <main class="page">
    <AppPageHeader title="Customers">
      <template #actions>
        <NuxtLink
          class="button"
          to="/customers/new"
        >
          New customer
        </NuxtLink>
        <button
          type="button"
          class="secondary"
          :disabled="pending || refreshing"
          @click="refreshStatus"
        >
          Refresh
        </button>
      </template>
      {{ summary.customerCount }} customers. Last checked {{ checkedAt || '—' }}.
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
      No customers match.
    </p>
    <table
      v-else
      class="data-table"
      aria-label="Customers"
    >
      <thead>
        <tr>
          <th>Customer</th>
          <th>Slug</th>
          <th>Envs</th>
          <th>PROD</th>
          <th>DEV</th>
          <th>Overall</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="customer in rows"
          :key="customer.id"
        >
          <td>
            <NuxtLink :to="`/customers/${customer.id}`">
              {{ customer.displayName }}
            </NuxtLink>
          </td>
          <td>{{ customer.slug }}</td>
          <td>{{ customer.environmentCount }}</td>
          <td>
            <AppStatusBadge
              v-if="customer.prod"
              :status="customer.prod.status"
            />
            <span
              v-else
              class="muted"
            >—</span>
          </td>
          <td>
            <AppStatusBadge
              v-if="customer.dev"
              :status="customer.dev.status"
            />
            <span
              v-else
              class="muted"
            >—</span>
          </td>
          <td><AppStatusBadge :status="customer.overall" /></td>
        </tr>
      </tbody>
    </table>
  </main>
</template>
