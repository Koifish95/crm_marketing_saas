<script setup lang="ts">
import { filterByQuery, groupProductInstances, operatorEnvironmentStatus } from '~~/shared/utils/fleet'
import { isActiveStatus } from '~~/shared/utils/lifecycle'

useHead({ title: 'Product instances' })

const { error, pending, refreshing, environments, summary, checkedAt, refreshStatus, data } = await useFleetStatus()
const query = ref('')
const statusFilter = ref('active')
const productFilter = ref('')
const instances = computed(() => {
  let list = groupProductInstances(environments.value, data.value?.productInstances || [])
  if (statusFilter.value === 'active') {
    list = list.filter(row => isActiveStatus(row.status))
  } else if (statusFilter.value === 'inactive') {
    list = list.filter(row => !isActiveStatus(row.status))
  }
  if (productFilter.value) {
    list = list.filter(row => row.productId === productFilter.value)
  }
  return filterByQuery(
    list,
    query.value,
    row => `${row.displayName} ${row.productId} ${summary.value.customers.find(customer => customer.id === row.customerId)?.displayName || ''}`,
  )
})

function customerName(id: string) {
  return summary.value.customers.find(row => row.id === id)?.displayName || id
}
</script>

<template>
  <main class="page">
    <AppPageHeader title="Product instances">
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshStatus"
        />
      </template>
      One product per instance. A customer can own Martial Arts and Sales independently.
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
            All
          </option>
          <option value="martial-arts">
            Martial Arts
          </option>
          <option value="sales">
            Sales
          </option>
        </select>
      </label>
    </div>
    <AppAsyncPanel
      :pending="pending && !checkedAt"
      :error="error"
      :empty="instances.length === 0"
      empty-message="No product instances match."
    >
      <AppDataTable
        label="Product instances"
        :columns="['Customer', 'Product', 'Lifecycle', 'PROD', 'DEV', 'Envs', 'Release', 'Hostname']"
      >
        <tr
          v-for="instance in instances"
          :key="instance.id"
        >
          <td>
            <NuxtLink :to="`/customers/${instance.customerId}`">
              {{ customerName(instance.customerId) }}
            </NuxtLink>
          </td>
          <td>
            <NuxtLink :to="`/customers/${instance.customerId}`">
              {{ instance.displayName }}
            </NuxtLink>
          </td>
          <td><AppStatusBadge :status="instance.status || 'active'" /></td>
          <td>
            <NuxtLink
              v-if="instance.prod"
              :to="`/environments/${instance.prod.id}`"
            >
              <AppStatusBadge :status="operatorEnvironmentStatus(instance.prod)" />
            </NuxtLink>
            <span
              v-else
              class="muted"
            >—</span>
          </td>
          <td>
            <NuxtLink
              v-if="instance.dev"
              :to="`/environments/${instance.dev.id}`"
            >
              <AppStatusBadge :status="operatorEnvironmentStatus(instance.dev)" />
            </NuxtLink>
            <span
              v-else
              class="muted"
            >—</span>
          </td>
          <td>{{ instance.environmentCount }}</td>
          <td>{{ instance.prod?.releaseId || instance.prod?.expectedImage || '—' }}</td>
          <td>{{ instance.prod?.publicHostname || '—' }}</td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
