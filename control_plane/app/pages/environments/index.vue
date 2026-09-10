<script setup lang="ts">
import { filterEnvironments } from '~~/shared/utils/fleet'

useHead({ title: 'Environments' })

const { error, pending, refreshing, environments, checkedAt, refreshStatus } = await useFleetStatus()
const query = ref('')
const typeFilter = ref('')
const rows = computed(() => filterEnvironments(environments.value, query.value, typeFilter.value))
</script>

<template>
  <main class="page">
    <AppPageHeader title="Environments">
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshStatus"
        />
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
    <AppAsyncPanel
      :pending="pending && !checkedAt"
      :error="error"
      :empty="rows.length === 0"
      empty-message="No environments match."
    >
      <AppDataTable
        label="Environments"
        :columns="['Customer', 'Environment', 'Type', 'Node', 'Runtime', 'Health', 'Image', 'Access']"
      >
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
          <td><AppAccessLink :href="env.accessUrl" /></td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
