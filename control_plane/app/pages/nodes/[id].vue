<script setup lang="ts">
const route = useRoute()
const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const nodeId = computed(() => String(route.params.id || ''))
const node = computed(() => summary.value.nodes.find(row => row.id === nodeId.value) ?? null)

useHead({ title: computed(() => node.value?.name || 'Hosting node') })
</script>

<template>
  <main class="page">
    <AppPageHeader
      :title="node?.name || 'Hosting node'"
      :crumbs="[{ to: '/nodes', label: 'Hosting Nodes' }, { label: node?.name || 'Record' }]"
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
      v-if="pending && !node"
      class="muted"
    >
      Loading…
    </p>
    <p
      v-else-if="error || !node"
      class="muted"
    >
      Hosting node not found in the current registry.
    </p>
    <template v-else>
      <dl class="dl">
        <dt>Node ID</dt>
        <dd>{{ node.id }}</dd>
        <dt>Kind</dt>
        <dd>{{ node.kind }}</dd>
        <dt>Driver</dt>
        <dd>{{ node.driver }}</dd>
        <dt>Overall</dt>
        <dd><AppStatusBadge :status="node.overall" /></dd>
      </dl>
      <h2>Environments</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Type</th>
            <th>Status</th>
            <th>Runtime</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="env in node.environments"
            :key="env.id"
          >
            <td>
              <NuxtLink :to="`/customers/${env.customer.id}`">
                {{ env.customer.displayName }}
              </NuxtLink>
            </td>
            <td>
              <NuxtLink :to="`/environments/${env.id}`">
                {{ env.type }}
              </NuxtLink>
            </td>
            <td><AppStatusBadge :status="env.status" /></td>
            <td>{{ env.runtime }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </main>
</template>
