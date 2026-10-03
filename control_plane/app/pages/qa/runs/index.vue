<script setup lang="ts">
useHead({ title: 'QA Runs' })
const { data, pending, error, refresh } = await useFetch('/api/qa/runs')
</script>

<template>
  <main class="page">
    <AppPageHeader title="QA Runs">
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="pending"
          @refresh="refresh"
        />
      </template>Historical automated browser QA runs. Run execution is intentionally CLI-controlled.
    </AppPageHeader>
    <AppAsyncPanel
      :pending="pending"
      :error="error"
      :empty="!data?.runs.length"
      empty-message="No QA runs yet."
    >
      <AppDataTable
        label="QA runs"
        :columns="['Started', 'Product', 'Environment', 'Build', 'Status', 'Browser', 'Target']"
      >
        <tr
          v-for="run in data!.runs"
          :key="run.id"
        >
          <td><NuxtLink :to="`/qa/runs/${run.id}`">{{ new Date(run.startedAt).toLocaleString() }}</NuxtLink></td><td>{{ run.productId }}</td><td>{{ run.environmentType }}</td><td>{{ run.buildVersion || 'Unknown' }}</td><td><AppStatusBadge :status="run.status.toLowerCase().replaceAll('_', '-')" /></td><td>{{ run.browser || '—' }} {{ run.viewport || '' }}</td><td>{{ run.baseUrl }}</td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
