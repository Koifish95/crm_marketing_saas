<script setup lang="ts">
useHead({ title: 'Dashboard' })

const { error, pending, refreshing, summary, checkedAt, refreshStatus, data } = await useFleetStatus()
const alerts = computed(() => data.value?.alerts || [])
const { data: eventsPayload } = await useFetch<{ events: { id: string, createdAt: string, action: string, summary: string }[] }>('/api/events', {
  query: { limit: 12 },
})
</script>

<template>
  <main class="page">
    <AppPageHeader title="Operations overview">
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshStatus"
        />
      </template>
      On-demand health. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <AppAsyncPanel
      :pending="pending && !checkedAt"
      :error="error"
    >
      <section
        class="summary-grid"
        aria-label="Fleet summary"
      >
        <article class="card">
          <p class="muted">
            Active customers
          </p>
          <p class="headline">
            {{ summary.activeCustomerCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Inactive customers
          </p>
          <p class="headline">
            {{ summary.inactiveCustomerCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Active products
          </p>
          <p class="headline">
            {{ summary.activeInstanceCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Environments
          </p>
          <p class="headline">
            {{ summary.environmentCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            PROD
          </p>
          <p class="headline">
            {{ summary.prodCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Non-PROD
          </p>
          <p class="headline">
            {{ summary.nonProdCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Running
          </p>
          <p class="headline">
            {{ summary.runningCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Stopped
          </p>
          <p class="headline">
            {{ summary.stoppedCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Unhealthy
          </p>
          <p class="headline">
            {{ summary.unhealthyCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Failed provision
          </p>
          <p class="headline">
            {{ summary.failedCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Decommissioned
          </p>
          <p class="headline">
            {{ summary.decommissionedCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Archived
          </p>
          <p class="headline">
            {{ summary.archivedCount }}
          </p>
        </article>
      </section>
      <h2>Needs attention</h2>
      <p
        v-if="alerts.length === 0"
        class="muted"
      >
        No provisioning failures, outages, backup gaps, off-host gaps, or DEV/PROD release mismatches from current data.
      </p>
      <ul
        v-else
        class="attention-list"
      >
        <li
          v-for="(alert, index) in alerts"
          :key="`${alert.kind}-${alert.environmentId || index}`"
        >
          <strong>{{ alert.kind }}</strong>
          —
          <NuxtLink
            v-if="alert.environmentId"
            :to="`/environments/${alert.environmentId}`"
          >
            {{ alert.message }}
          </NuxtLink>
          <span v-else>{{ alert.message }}</span>
        </li>
      </ul>
      <h2>Recent activity</h2>
      <p
        v-if="!eventsPayload?.events?.length"
        class="muted"
      >
        No operator events recorded yet. Start, stop, backup, upgrade, deactivate, and archive write here.
      </p>
      <AppDataTable
        v-else
        label="Recent operator events"
        :columns="['When', 'Action', 'Summary']"
      >
        <tr
          v-for="event in eventsPayload.events"
          :key="event.id"
        >
          <td>{{ event.createdAt }}</td>
          <td>{{ event.action }}</td>
          <td>{{ event.summary }}</td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
