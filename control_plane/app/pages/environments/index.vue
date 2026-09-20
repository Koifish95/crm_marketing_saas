<script setup lang="ts">
import {
  allVisibleSelected,
  formatBulkNotice,
  isStartableEnvironment,
  isStoppableEnvironment,
  operatorEnvironmentStatus,
  pollFleetUntilHealthy,
  toggleVisibleSelection,
  type FleetStatusResponse,
} from '~~/shared/utils/fleet'
import { filterAndSortEnvironments, type EnvironmentListFilters } from '~~/shared/utils/operator-filters'
import { formatBackupCreatedAt } from '~~/shared/utils/fleet-backup'

useHead({ title: 'Environments' })

type BulkResponse = FleetStatusResponse & {
  results: { id: string, slug: string, outcome: string, message: string }[]
}

const { error, pending, refreshing, environments, checkedAt, refreshStatus, applyStatus } = await useFleetStatus()
const query = ref('')
const customerFilter = ref('')
const typeFilter = ref('')
const prodKind = ref('')
const productFilter = ref('')
const lifecycleFilter = ref('')
const runtimeFilter = ref('')
const healthFilter = ref('')
const backupFilter = ref('')
const nodeFilter = ref('')
const includeArchived = ref(false)
const sort = ref<'customer' | 'product' | 'type' | 'status' | 'backup' | 'release'>('customer')
const selected = ref<string[]>([])
const busy = ref(false)
const confirmStopAll = ref(false)
const stopDialog = ref<'selected' | 'all' | ''>('')
const actionError = ref('')
const actionNotice = ref('')
const filters = computed<EnvironmentListFilters>(() => ({
  query: query.value,
  customerId: customerFilter.value,
  type: typeFilter.value,
  prodKind: prodKind.value as 'prod' | 'non-prod' | '',
  productId: productFilter.value,
  nodeId: nodeFilter.value,
  lifecycle: lifecycleFilter.value,
  runtime: runtimeFilter.value,
  health: healthFilter.value as EnvironmentListFilters['health'],
  backup: backupFilter.value as EnvironmentListFilters['backup'],
  includeArchived: includeArchived.value,
  sort: sort.value,
}))
const customerOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const env of environments.value) {
    seen.set(env.customer.id, env.customer.displayName)
  }
  return [...seen.entries()].sort((left, right) => left[1].localeCompare(right[1]))
})
const nodeOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const env of environments.value) {
    seen.set(env.node.id, env.node.name)
  }
  return [...seen.entries()].sort((left, right) => left[1].localeCompare(right[1]))
})
const rows = computed(() => filterAndSortEnvironments(environments.value, filters.value))
const visibleIds = computed(() => rows.value.map(env => env.id))
const headerChecked = computed(() => allVisibleSelected(selected.value, visibleIds.value))
const startableAll = computed(() => environments.value.filter(isStartableEnvironment).length)
const stoppableAll = computed(() => environments.value.filter(isStoppableEnvironment).length)

watch(filters, () => {
  selected.value = []
}, { deep: true })

function clearFilters() {
  query.value = ''
  customerFilter.value = ''
  typeFilter.value = ''
  prodKind.value = ''
  productFilter.value = ''
  lifecycleFilter.value = ''
  runtimeFilter.value = ''
  healthFilter.value = ''
  backupFilter.value = ''
  nodeFilter.value = ''
  includeArchived.value = false
  sort.value = 'customer'
}

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
  if (action === 'stop' && scope === 'all' && !confirmStopAll.value) {
    return
  }
  stopDialog.value = ''
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
      {{ rows.length }} shown of {{ environments.length }} registered. Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <p
      v-if="actionError"
      class="action-error"
      role="status"
    >
      {{ actionError }}
    </p>
    <p
      v-else-if="actionNotice"
      class="action-status"
      role="status"
    >
      {{ actionNotice }}
    </p>
    <div class="filters">
      <AppSearchField v-model="query" />
      <label>
        Customer
        <select v-model="customerFilter">
          <option value="">
            All
          </option>
          <option
            v-for="[id, name] in customerOptions"
            :key="id"
            :value="id"
          >
            {{ name }}
          </option>
        </select>
      </label>
      <label>
        Product
        <select v-model="productFilter">
          <option value="">
            All
          </option>
          <option value="martial-arts">
            Martial Arts
          </option>
          <option value="sales">
            Sales
          </option>
        </select>
      </label>
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
      <label>
        Kind
        <select v-model="prodKind">
          <option value="">
            All
          </option>
          <option value="prod">
            PROD only
          </option>
          <option value="non-prod">
            Non-PROD
          </option>
        </select>
      </label>
      <label>
        Lifecycle
        <select v-model="lifecycleFilter">
          <option value="">
            All live
          </option>
          <option value="ready">
            Ready
          </option>
          <option value="failed">
            Failed
          </option>
          <option value="provisioning">
            Provisioning
          </option>
          <option value="decommissioned">
            Decommissioned
          </option>
          <option value="archived">
            Archived
          </option>
        </select>
      </label>
      <label>
        Runtime
        <select v-model="runtimeFilter">
          <option value="">
            All
          </option>
          <option value="running">
            Running
          </option>
          <option value="stopped">
            Stopped
          </option>
          <option value="missing">
            Missing
          </option>
        </select>
      </label>
      <label>
        Health
        <select v-model="healthFilter">
          <option value="">
            All
          </option>
          <option value="healthy">
            Healthy
          </option>
          <option value="unhealthy">
            Unhealthy / unknown
          </option>
        </select>
      </label>
      <label>
        Node
        <select v-model="nodeFilter">
          <option value="">
            All
          </option>
          <option
            v-for="[id, name] in nodeOptions"
            :key="id"
            :value="id"
          >
            {{ name }}
          </option>
        </select>
      </label>
      <label>
        Backup
        <select v-model="backupFilter">
          <option value="">
            All
          </option>
          <option value="none">
            No backup
          </option>
          <option value="stale">
            Stale (>7d)
          </option>
          <option value="offhost-missing">
            PROD missing off-host
          </option>
        </select>
      </label>
      <label>
        Sort
        <select v-model="sort">
          <option value="customer">
            Customer
          </option>
          <option value="product">
            Product
          </option>
          <option value="type">
            Type
          </option>
          <option value="status">
            Health
          </option>
          <option value="release">
            Release
          </option>
          <option value="backup">
            Last backup
          </option>
        </select>
      </label>
      <label>
        <input
          v-model="includeArchived"
          type="checkbox"
        >
        Show archived
      </label>
      <button
        type="button"
        class="secondary"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </div>
    <div class="row">
      <span class="muted">{{ selected.length }} selected. Start All / Stop All use the registered fleet, not this filter.</span>
      <button
        type="button"
        :disabled="busy || selected.length === 0"
        @click="runBulk('start', 'selected')"
      >
        Start Selected
      </button>
      <button
        type="button"
        class="secondary"
        :disabled="busy || selected.length === 0"
        @click="stopDialog = 'selected'"
      >
        Stop Selected ({{ selected.length }})
      </button>
    </div>
    <div class="row">
      <button
        type="button"
        :disabled="busy || startableAll === 0"
        @click="runBulk('start', 'all')"
      >
        Start All ({{ startableAll }} of {{ environments.length }} registered)
      </button>
      <button
        type="button"
        class="secondary"
        :disabled="busy || stoppableAll === 0 || !confirmStopAll"
        @click="stopDialog = 'all'"
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
        :columns="['Customer', 'Product', 'Environment', 'Type', 'Lifecycle', 'Runtime', 'Health', 'Node', 'Release', 'Backup', 'Hostname']"
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
          <td>{{ env.productInstance?.displayName || '—' }}</td>
          <td>
            <NuxtLink :to="`/environments/${env.id}`">
              {{ env.displayName }}
            </NuxtLink>
            <div class="muted">
              {{ env.slug }}
            </div>
          </td>
          <td>{{ env.type }}</td>
          <td><AppStatusBadge :status="env.lifecycleStatus || 'ready'" /></td>
          <td>{{ env.runtime }}</td>
          <td><AppStatusBadge :status="operatorEnvironmentStatus(env)" /></td>
          <td>{{ env.node.name }}</td>
          <td>{{ env.releaseId || env.expectedImage }}</td>
          <td>{{ env.lastBackup ? formatBackupCreatedAt(env.lastBackup.createdAt, env.customer.timezone) : 'none' }}</td>
          <td>{{ env.publicHostname || '—' }}</td>
        </tr>
      </AppDataTable>
    </AppAsyncPanel>
    <AppConfirmDialog
      v-if="stopDialog === 'selected'"
      title="Stop selected environments?"
      confirm-label="Stop selected"
      @cancel="stopDialog = ''"
      @confirm="runBulk('stop', 'selected')"
    >
      <p>This stops {{ selected.length }} selected environment process(es). Volumes, backups, and identity stay. This is not Decommission or Archive.</p>
    </AppConfirmDialog>
    <AppConfirmDialog
      v-if="stopDialog === 'all'"
      title="Stop the registered fleet?"
      confirm-label="Stop all eligible"
      danger
      @cancel="stopDialog = ''"
      @confirm="runBulk('stop', 'all')"
    >
      <p>This stops {{ stoppableAll }} stoppable of {{ environments.length }} registered environments. It ignores the table filter. Volumes stay.</p>
    </AppConfirmDialog>
  </main>
</template>
