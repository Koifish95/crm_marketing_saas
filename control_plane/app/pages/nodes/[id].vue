<script setup lang="ts">
import { findById } from '~~/shared/utils/fleet'

const route = useRoute()
const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const nodeId = computed(() => String(route.params.id || ''))
const node = computed(() => findById(summary.value.nodes, nodeId.value))

useHead({ title: computed(() => node.value ? `Hosting node · ${node.value.name}` : 'Hosting node') })
</script>

<template>
  <main class="page">
    <AppPageHeader
      :title="node?.name || 'Hosting node'"
      :crumbs="[{ to: '/nodes', label: 'Hosting Nodes' }, { label: node?.name || 'Record' }]"
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
      :pending="pending && !node"
      :error="error || (!pending && !node)"
      error-message="Hosting node not found in the current registry."
    >
      <dl class="dl">
        <dt>Node ID</dt>
        <dd>{{ node?.id }}</dd>
        <dt>Kind</dt>
        <dd>{{ node?.kind }}</dd>
        <dt>Driver</dt>
        <dd>{{ node?.driver }}</dd>
        <dt>Overall</dt>
        <dd><AppStatusBadge :status="node?.overall || 'unknown'" /></dd>
      </dl>
      <h2>Environments</h2>
      <AppDataTable
        label="Placed environments"
        :columns="['Customer', 'Environment', 'Type', 'Status', 'Runtime', 'Access']"
      >
        <tr
          v-for="env in node?.environments"
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
          <td><AppStatusBadge :status="env.status" /></td>
          <td>{{ env.runtime }}</td>
          <td><AppAccessLink :href="env.accessUrl" /></td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
