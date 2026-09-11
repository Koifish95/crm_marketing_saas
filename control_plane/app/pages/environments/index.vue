<script setup lang="ts">
import {
  allVisibleSelected,
  filterEnvironments,
  formatBulkNotice,
  isStartableEnvironment,
  isStoppableEnvironment,
  pollFleetUntilHealthy,
  toggleVisibleSelection,
  type FleetStatusResponse,
} from '~~/shared/utils/fleet'

useHead({ title: 'Environments' })

type BulkResponse = FleetStatusResponse & {
  results: { id: string, slug: string, outcome: string, message: string }[]
}

const { error, pending, refreshing, environments, checkedAt, refreshStatus, applyStatus } = await useFleetStatus()
const query = ref('')
const typeFilter = ref('')
const selected = ref<string[]>([])
const busy = ref(false)
const confirmStopAll = ref(false)
const actionError = ref('')
const actionNotice = ref('')
const rows = computed(() => filterEnvironments(environments.value, query.value, typeFilter.value))
const visibleIds = computed(() => rows.value.map(env => env.id))
const headerChecked = computed(() => allVisibleSelected(selected.value, visibleIds.value))
const startableAll = computed(() => environments.value.filter(isStartableEnvironment).length)
const stoppableAll = computed(() => environments.value.filter(isStoppableEnvironment).length)

watch([query, typeFilter], () => {
  selected.value = []
})

function toggleHeader(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selected.value = toggleVisibleSelection(selected.value, visibleIds.value, checked)
}

function toggleRow(id: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    selected.value = [...new Set([...selected.value, id])]
    return
  }
  selected.value = selected.value.filter(item => item !== id)
}

async function runBulk(action: 'start' | 'stop', scope: 'selected' | 'all') {
  if (busy.value) {
    return
  }
  if (action === 'stop' && scope === 'selected') {
    if (!window.confirm(`Stop ${selected.value.length} selected environment(s)? Volumes stay.`)) {
      return
    }
  }
  if (action === 'stop' && scope === 'all') {
    if (!confirmStopAll.value) {
      return
    }
    if (!window.confirm(`Stop ${stoppableAll.value} stoppable of ${environments.value.length} registered environments? This is the fleet, not the visible filter.`)) {
      return
    }
  }
  busy.value = true
  actionError.value = ''
  actionNotice.value = scope === 'all'
    ? `${action === 'start' ? 'Starting' : 'Stopping'} eligible registered environments…`
    : `${action === 'start' ? 'Starting' : 'Stopping'} selected environments…`
  try {
    const result = await $fetch<BulkResponse>(`/api/environments/bulk/${action}`, {
      method: 'POST',
      body: scope === 'all' ? { scope } : { scope, ids: selected.value },
    })
    if (result.checkedAt && result.environments) {
      applyStatus({ checkedAt: result.checkedAt, environments: result.environments })
    }
    const wanted = result.results.filter(row => row.outcome === 'ok').map(row => row.id)
    if (wanted.length > 0) {
      const target = action === 'start' ? 'healthy' : 'stopped'
      await pollFleetUntilHealthy({
        isHealthy: () => wanted.every((id) => {
          const env = environments.value.find(item => item.id === id)
          return env?.status === target
        }),
        refresh: refreshStatus,
      })
    }
    actionNotice.value = formatBulkNotice(action, result.results)
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, `${action === 'start' ? 'Start' : 'Stop'} failed.`)
  } finally {
    busy.value = false
  }
}
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
    <p
      v-if="actionError"
      class="action-error"
      role="status"
      aria-live="polite"
    >
      {{ actionError }}
    </p>
    <p
      v-else-if="actionNotice"
      class="action-status"
      role="status"
      aria-live="polite"
    >
      {{ actionNotice }}
    </p>
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
          <option value="STAGE">
            STAGE
          </option>
          <option value="UAT">
            UAT
          </option>
          <option value="TRAINING">
            TRAINING
          </option>
        </select>
      </label>
    </div>
    <div class="row">
      <span class="muted">{{ selected.length }} selected. Start All / Stop All use the registered fleet, not this filter.</span>
      <button
        type="button"
        :disabled="busy || selected.length === 0"
        :aria-busy="busy"
        @click="runBulk('start', 'selected')"
      >
        Start Selected
      </button>
      <button
        type="button"
        class="secondary"
        :disabled="busy || selected.length === 0"
        :aria-busy="busy"
        @click="runBulk('stop', 'selected')"
      >
        Stop Selected ({{ selected.length }})
      </button>
    </div>
    <div class="row">
      <button
        type="button"
        :disabled="busy || startableAll === 0"
        :aria-busy="busy"
        @click="runBulk('start', 'all')"
      >
        Start All ({{ startableAll }} of {{ environments.length }} registered)
      </button>
      <button
        type="button"
        class="secondary"
        :disabled="busy || stoppableAll === 0 || !confirmStopAll"
        :aria-busy="busy"
        @click="runBulk('stop', 'all')"
      >
        Stop All ({{ stoppableAll }} of {{ environments.length }} registered)
      </button>
      <label>
        <input
          v-model="confirmStopAll"
          type="checkbox"
        >
        I understand Stop All affects the registered fleet, not just visible rows.
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
        <template #leading>
          <input
            type="checkbox"
            :checked="headerChecked"
            :disabled="visibleIds.length === 0"
            aria-label="Select visible environments"
            @change="toggleHeader"
          >
        </template>
        <tr
          v-for="env in rows"
          :key="env.id"
        >
          <td class="select-col">
            <input
              type="checkbox"
              :checked="selected.includes(env.id)"
              :aria-label="`Select ${env.customer.displayName} ${env.displayName}`"
              @change="toggleRow(env.id, $event)"
            >
          </td>
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
