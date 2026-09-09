<script setup lang="ts">
const route = useRoute()
const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const tab = ref('overview')
const customerId = computed(() => String(route.params.id || ''))
const customer = computed(() => summary.value.customers.find(row => row.id === customerId.value) ?? null)

useHead({ title: computed(() => customer.value?.displayName || 'Customer') })
</script>

<template>
  <main class="page">
    <AppPageHeader
      :title="customer?.displayName || 'Customer'"
      :crumbs="[{ to: '/customers', label: 'Customers' }, { label: customer?.displayName || 'Record' }]"
    >
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
      Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <p
      v-if="pending && !customer"
      class="muted"
    >
      Loading…
    </p>
    <p
      v-else-if="error || !customer"
      class="muted"
    >
      Customer not found in the current registry.
    </p>
    <template v-else>
      <AppWorkspaceTabs
        v-model="tab"
        :tabs="[
          { id: 'overview', label: 'Overview' },
          { id: 'environments', label: 'Environments' },
          { id: 'configuration', label: 'Configuration' },
        ]"
      />
      <section
        v-if="tab === 'overview'"
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
      >
        <dl class="dl">
          <dt>Customer ID</dt>
          <dd>{{ customer.id }}</dd>
          <dt>Slug</dt>
          <dd>{{ customer.slug }}</dd>
          <dt>Overall</dt>
          <dd><AppStatusBadge :status="customer.overall" /></dd>
          <dt>Hosting node</dt>
          <dd>{{ customer.environments[0]?.node.name || '—' }}</dd>
        </dl>
      </section>
      <section
        v-else-if="tab === 'environments'"
        id="panel-environments"
        role="tabpanel"
        aria-labelledby="tab-environments"
      >
        <table class="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>Runtime</th>
              <th>Image</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="env in customer.environments"
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
          </tbody>
        </table>
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
          <dd>{{ customer.timezone }}</dd>
          <dt>Admin email</dt>
          <dd>{{ customer.adminEmail }}</dd>
          <dt>Environments</dt>
          <dd>{{ customer.environmentCount }}</dd>
        </dl>
      </section>
    </template>
  </main>
</template>
