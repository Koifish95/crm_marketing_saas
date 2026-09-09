<script setup lang="ts">
import { findById } from '~~/shared/utils/fleet'
import { CUSTOMER_TABS } from '~~/shared/utils/nav'

const route = useRoute()
const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const tab = ref('overview')
const customerId = computed(() => String(route.params.id || ''))
const customer = computed(() => findById(summary.value.customers, customerId.value))

useHead({ title: computed(() => customer.value ? `Customer · ${customer.value.displayName}` : 'Customer') })
</script>

<template>
  <main class="page">
    <AppPageHeader
      :title="customer?.displayName || 'Customer'"
      :crumbs="[{ to: '/customers', label: 'Customers' }, { label: customer?.displayName || 'Record' }]"
    >
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshStatus"
        />
      </template>
      Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <AppAsyncPanel
      :pending="pending && !customer"
      :error="error || (!pending && !customer)"
      error-message="Customer not found in the current registry."
    >
      <AppWorkspaceTabs
        v-model="tab"
        :tabs="[...CUSTOMER_TABS]"
      />
      <section
        v-if="tab === 'overview'"
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
      >
        <dl class="dl">
          <dt>Customer ID</dt>
          <dd>{{ customer?.id }}</dd>
          <dt>Slug</dt>
          <dd>{{ customer?.slug }}</dd>
          <dt>Overall</dt>
          <dd><AppStatusBadge :status="customer?.overall || 'unknown'" /></dd>
          <dt>Hosting node</dt>
          <dd>{{ customer?.environments[0]?.node.name || '—' }}</dd>
        </dl>
      </section>
      <section
        v-else-if="tab === 'environments'"
        id="panel-environments"
        role="tabpanel"
        aria-labelledby="tab-environments"
      >
        <AppDataTable
          label="Customer environments"
          :columns="['Type', 'Status', 'Runtime', 'Image']"
        >
          <tr
            v-for="env in customer?.environments"
            :key="env.id"
          >
            <td>
              <NuxtLink :to="`/environments/${env.id}`">
                {{ env.type }}
              </NuxtLink>
            </td>
            <td><AppStatusBadge :status="env.status" /></td>
            <td>{{ env.runtime }}</td>
            <td>{{ env.expectedImage }}</td>
          </tr>
        </AppDataTable>
      </section>
      <section
        v-else
        id="panel-configuration"
        role="tabpanel"
        aria-labelledby="tab-configuration"
      >
        <p class="muted">
          Read-only. There is no customer edit API.
        </p>
        <dl class="dl">
          <dt>Timezone</dt>
          <dd>{{ customer?.timezone }}</dd>
          <dt>Admin email</dt>
          <dd>{{ customer?.adminEmail }}</dd>
          <dt>Environments</dt>
          <dd>{{ customer?.environmentCount }}</dd>
        </dl>
      </section>
    </AppAsyncPanel>
  </main>
</template>
