<script setup lang="ts">
useHead({ title: 'Dashboard' })

const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
</script>

<template>
  <main class="page">
    <AppPageHeader title="Dashboard">
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
            Missing
          </p>
          <p class="headline">
            {{ summary.missingCount }}
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
        No unhealthy, unknown, or missing environments.
      </p>
      <AppDataTable
        v-else
        label="Environments that need attention"
        :columns="['Customer', 'Environment', 'Status', 'Runtime', 'Access']"
      >
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
          <td><AppAccessLink :href="env.accessUrl" /></td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
  </main>
</template>
