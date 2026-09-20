<script setup lang="ts">
useHead({ title: 'Reports' })

const { data, error, pending, refresh } = await useFetch<{
  checkedAt: string
  reports: {
    customers: { total: number, active: number, inactive: number }
    productInstances: { total: number, active: number, byProduct: { productId: string, count: number }[] }
    environments: {
      total: number
      running: number
      stopped: number
      unhealthy: number
      failed: number
      decommissioned: number
      archived: number
      byType: { type: string, count: number }[]
    }
    releases: {
      byImage: { image: string, count: number }[]
      mismatches: { customer?: string, product?: string, prod: string, dev: string, environmentId: string }[]
    }
    backups: {
      none: { id: string, headline: string }[]
      stale: { id: string, headline: string }[]
      prodMissingOffhost: { id: string, headline: string }[]
    }
    hosting: { ports: { customer: string, environment: string, type: string, hostPort?: number, node: string }[], diskWarning: string | null }
    gaps: string[]
  }
}>('/api/reports')
</script>

<template>
  <main class="page">
    <AppPageHeader title="Reports">
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="pending"
          @refresh="refresh"
        />
      </template>
      Platform operations only. These numbers come from the registry, Docker inspect, health, and backup rows. No uptime history is collected.
    </AppPageHeader>
    <AppAsyncPanel
      :pending="pending"
      :error="error"
    >
      <section
        v-if="data?.reports"
        class="summary-grid"
      >
        <article class="card">
          <p class="muted">
            Active customers
          </p>
          <p class="headline">
            {{ data.reports.customers.active }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Inactive customers
          </p>
          <p class="headline">
            {{ data.reports.customers.inactive }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Running
          </p>
          <p class="headline">
            {{ data.reports.environments.running }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Archived
          </p>
          <p class="headline">
            {{ data.reports.environments.archived }}
          </p>
        </article>
      </section>
      <h2>DEV / PROD release mismatches</h2>
      <p
        v-if="!data?.reports.releases.mismatches.length"
        class="muted"
      >
        No current DEV/PROD release mismatches.
      </p>
      <ul
        v-else
        class="attention-list"
      >
        <li
          v-for="row in data.reports.releases.mismatches"
          :key="row.environmentId"
        >
          <NuxtLink :to="`/environments/${row.environmentId}`">
            {{ row.customer }} {{ row.product }}: PROD {{ row.prod }} vs DEV {{ row.dev }}
          </NuxtLink>
        </li>
      </ul>
      <h2>Backup posture</h2>
      <p class="muted">
        Stale means last backup older than 7 days. That is an attention heuristic, not a retention policy (zips still prune at 14 days).
      </p>
      <ul class="attention-list">
        <li
          v-for="row in data?.reports.backups.none"
          :key="row.id"
        >
          <NuxtLink :to="`/environments/${row.id}`">
            No backup: {{ row.headline }}
          </NuxtLink>
        </li>
        <li
          v-for="row in data?.reports.backups.prodMissingOffhost"
          :key="`off-${row.id}`"
        >
          <NuxtLink :to="`/environments/${row.id}`">
            PROD missing off-host: {{ row.headline }}
          </NuxtLink>
        </li>
      </ul>
      <h2>Assigned ports</h2>
      <AppDataTable
        label="Host ports"
        :columns="['Port', 'Node', 'Customer', 'Environment', 'Type']"
      >
        <tr
          v-for="row in data?.reports.hosting.ports"
          :key="`${row.node}-${row.hostPort}-${row.environment}`"
        >
          <td>{{ row.hostPort }}</td>
          <td>{{ row.node }}</td>
          <td>{{ row.customer }}</td>
          <td>{{ row.environment }}</td>
          <td>{{ row.type }}</td>
        </tr>
      </AppDataTable>
      <h2>Known gaps</h2>
      <ul>
        <li
          v-for="gap in data?.reports.gaps"
          :key="gap"
        >
          {{ gap }}
        </li>
      </ul>
      <p
        v-if="data?.reports.hosting.diskWarning"
        class="action-error"
      >
        {{ data.reports.hosting.diskWarning }}
      </p>
    </AppAsyncPanel>
  </main>
</template>
