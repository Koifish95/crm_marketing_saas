<script setup lang="ts">
useHead({ title: 'Dashboard' })

const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
</script>

<template>
  <main class="page">
    <AppPageHeader title="Dashboard">
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
      On-demand health. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <p
      v-if="pending && !checkedAt"
      class="muted"
    >
      Loading…
    </p>
    <p
      v-else-if="error"
      class="muted"
    >
      Could not load the registry.
    </p>
    <template v-else>
      <section
        class="summary-grid"
        aria-label="Fleet summary"
      >
        <article class="card">
          <p class="muted">
            Customers
          </p>
          <p class="headline">
            {{ summary.customerCount }}
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
            DEV
          </p>
          <p class="headline">
            {{ summary.devCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Healthy
          </p>
          <p class="headline">
            {{ summary.healthyCount }}
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
            Stopped
          </p>
          <p class="headline">
            {{ summary.stoppedCount }}
          </p>
        </article>
        <article class="card">
          <p class="muted">
            Hosting nodes
          </p>
          <p class="headline">
            {{ summary.nodeCount }}
          </p>
        </article>
      </section>
      <h2>Needs attention</h2>
      <p
        v-if="summary.needsAttention.length === 0"
        class="muted"
      >
        No unhealthy or unknown environments.
      </p>
      <table
        v-else
        class="data-table"
        aria-label="Environments that need attention"
      >
        <thead>
          <tr>
            <th>Customer</th>
            <th>Environment</th>
            <th>Status</th>
            <th>Runtime</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="env in summary.needsAttention"
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
