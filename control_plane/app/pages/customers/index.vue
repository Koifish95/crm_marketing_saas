<script setup lang="ts">
import { filterByQuery } from '~~/shared/utils/fleet'
import { customerSearchText } from '~~/shared/utils/operator-filters'
import { isActiveStatus } from '~~/shared/utils/lifecycle'

useHead({ title: 'Customers' })

const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const query = ref('')
const statusFilter = ref('active')
const productFilter = ref('')
const sort = ref('name')
const rows = computed(() => {
  let list = summary.value.customers
  if (statusFilter.value === 'active') {
    list = list.filter(row => isActiveStatus(row.status))
  } else if (statusFilter.value === 'inactive') {
    list = list.filter(row => !isActiveStatus(row.status))
  }
  if (productFilter.value) {
    list = list.filter(row => row.instances?.some(instance => instance.productId === productFilter.value))
  }
  list = filterByQuery(list, query.value, customerSearchText)
  return [...list].sort((left, right) => {
    if (sort.value === 'envs') {
      return right.environmentCount - left.environmentCount
    }
    if (sort.value === 'status') {
      return (left.status || 'active').localeCompare(right.status || 'active')
    }
    return left.displayName.localeCompare(right.displayName)
  })
})
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
      {{ summary.activeCustomerCount }} active, {{ summary.inactiveCustomerCount }} inactive. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <div class="filters">
      <AppSearchField v-model="query" />
      <label>
        Lifecycle
        <select v-model="statusFilter">
          <option value="active">
            Active
          </option>
          <option value="inactive">
            Inactive
          </option>
          <option value="all">
            All
          </option>
        </select>
      </label>
      <label>
        Product
        <select v-model="productFilter">
          <option value="">
            All products
          </option>
          <option value="martial-arts">
            Martial Arts
          </option>
          <option value="sales">
            Sales
          </option>
        </select>
      </label>
      <label>
        Sort
        <select v-model="sort">
          <option value="name">
            Name
          </option>
          <option value="envs">
            Environment count
          </option>
          <option value="status">
            Lifecycle
          </option>
        </select>
      </label>
      <button
        type="button"
        class="secondary"
        @click="query = ''; statusFilter = 'active'; productFilter = ''; sort = 'name'"
      >
        Clear filters
      </button>
    </div>
    <AppAsyncPanel
      :pending="pending && !checkedAt"
      :error="error"
      :empty="rows.length === 0"
      empty-message="No customers match."
    >
      <AppDataTable
        label="Customers"
        :columns="['Customer', 'Lifecycle', 'Products', 'Envs', 'Overall', 'Last issue']"
      >
        <tr
          v-for="customer in rows"
          :key="customer.id"
        >
          <td>
            <NuxtLink :to="`/customers/${customer.id}`">
              {{ customer.displayName }}
            </NuxtLink>
            <div class="muted">
              {{ customer.slug }}
            </div>
          </td>
          <td><AppStatusBadge :status="customer.status || 'active'" /></td>
          <td>{{ customer.instanceCount || 0 }}</td>
          <td>{{ customer.environmentCount }}</td>
          <td><AppStatusBadge :status="customer.overall" /></td>
          <td class="muted">
            {{ customer.environments.find(env => env.provisionError)?.provisionError || '—' }}
          </td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
