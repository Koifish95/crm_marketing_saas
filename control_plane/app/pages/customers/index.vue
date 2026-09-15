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
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshStatus"
        />
      </template>
      {{ summary.customerCount }} customers. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <AppSearchField v-model="query" />
    <AppAsyncPanel
      :pending="pending && !checkedAt"
      :error="error"
      :empty="rows.length === 0"
      empty-message="No customers match."
    >
      <AppDataTable
        label="Customers"
        :columns="['Customer', 'Slug', 'Products', 'Envs', 'Overall']"
      >
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
          <td>{{ customer.instanceCount || 0 }}</td>
          <td>{{ customer.environmentCount }}</td>
          <td><AppStatusBadge :status="customer.overall" /></td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
