<script setup lang="ts">
import { findById } from '~~/shared/utils/fleet'
import { ENVIRONMENT_TABS } from '~~/shared/utils/nav'
import { isRetryableLifecycle } from '~~/shared/utils/provision'

const route = useRoute()
const { error, pending, refreshing, environments, checkedAt, refreshStatus } = await useFleetStatus()
const tab = ref('overview')
const relaunching = ref(false)
const retrying = ref(false)
const decommissioning = ref(false)
const confirmDecommission = ref(false)
const actionError = ref('')
const environmentId = computed(() => String(route.params.id || ''))
const env = computed(() => findById(environments.value, environmentId.value))
const decommissioned = computed(() => env.value?.lifecycleStatus === 'decommissioned')
const retryable = computed(() => isRetryableLifecycle(env.value?.lifecycleStatus))

useHead({
  title: computed(() => env.value
    ? `Environment · ${env.value.customer.displayName} · ${env.value.type}`
    : 'Environment'),
})

async function relaunch() {
  if (!env.value) {
    return
  }
  relaunching.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/environments/${env.value.id}/relaunch`, { method: 'POST' })
    await refreshStatus()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Relaunch failed.')
  } finally {
    relaunching.value = false
  }
}

async function retryProvision() {
  if (!env.value) {
    return
  }
  retrying.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/environments/${env.value.id}/provision`, { method: 'POST' })
    await refreshStatus()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Retry failed.')
  } finally {
    retrying.value = false
  }
}

async function decommission() {
  if (!env.value || !confirmDecommission.value) {
    return
  }
  decommissioning.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/environments/${env.value.id}/decommission`, { method: 'POST' })
    await refreshStatus()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Decommission failed.')
  } finally {
    decommissioning.value = false
  }
}
</script>

<template>
  <main class="page">
    <AppPageHeader
      :title="env?.headline || 'Environment'"
      :crumbs="env
        ? [
          { to: '/environments', label: 'Environments' },
          { to: `/customers/${env.customer.id}`, label: env.customer.displayName },
          { label: env.type },
        ]
        : [{ to: '/environments', label: 'Environments' }, { label: 'Record' }]"
    >
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshStatus"
        />
        <a
          v-if="env?.accessUrl"
          class="button"
          :href="env.accessUrl"
          target="_blank"
          rel="noreferrer"
        >Open</a>
        <button
          v-else
          type="button"
          disabled
        >
          Open
        </button>
        <button
          v-if="retryable"
          type="button"
          :disabled="retrying || !env"
          :aria-busy="retrying"
          @click="retryProvision"
        >
          {{ retrying ? 'Retrying…' : 'Retry' }}
        </button>
        <button
          type="button"
          :disabled="relaunching || !env || decommissioned || retryable"
          :aria-busy="relaunching"
          @click="relaunch"
        >
          {{ relaunching ? 'Relaunching…' : 'Relaunch' }}
        </button>
      </template>
      Last checked {{ checkedAt || '—' }}.
      <template v-if="retryable">
        Retry continues the existing provision. It remounts the same volumes. It does not rebuild.
      </template>
    </AppPageHeader>
    <p
      v-if="actionError"
      class="muted"
      role="status"
      aria-live="polite"
    >
      {{ actionError }}
    </p>
    <AppAsyncPanel
      :pending="pending && !env"
      :error="error || (!pending && !env)"
      error-message="Environment not found in the current registry."
    >
      <AppWorkspaceTabs
        v-model="tab"
        :tabs="[...ENVIRONMENT_TABS]"
      />
      <section
        v-if="tab === 'overview'"
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
      >
        <dl class="dl">
          <dt>Environment ID</dt>
          <dd>{{ env?.id }}</dd>
          <dt>Customer</dt>
          <dd>
            <NuxtLink :to="`/customers/${env?.customer.id}`">
              {{ env?.customer.displayName }}
            </NuxtLink>
          </dd>
          <dt>Type</dt>
          <dd>{{ env?.type }}</dd>
          <dt>Hosting node</dt>
          <dd>
            <NuxtLink :to="`/nodes/${env?.node.id}`">
              {{ env?.node.name }}
            </NuxtLink>
          </dd>
          <dt>Container</dt>
          <dd>{{ env?.containerName }}</dd>
          <dt>Image</dt>
          <dd>{{ env?.expectedImage }}</dd>
          <dt>Status</dt>
          <dd><AppStatusBadge :status="env?.status || 'unknown'" /></dd>
          <dt>Access URL</dt>
          <dd><AppAccessLink :href="env?.accessUrl" /></dd>
        </dl>
      </section>
      <section
        v-else-if="tab === 'runtime'"
        id="panel-runtime"
        role="tabpanel"
        aria-labelledby="tab-runtime"
      >
        <dl class="dl">
          <dt>Runtime</dt>
          <dd>{{ env?.runtime }}</dd>
          <dt>Combined status</dt>
          <dd><AppStatusBadge :status="env?.status || 'unknown'" /></dd>
          <dt>Application health</dt>
          <dd>{{ env?.healthOk ? 'ok' : (env?.healthError || 'not ok') }}</dd>
          <dt>Last checked</dt>
          <dd>{{ checkedAt || '—' }}</dd>
          <dt>Access URL</dt>
          <dd><AppAccessLink :href="env?.accessUrl" /></dd>
        </dl>
      </section>
      <section
        v-else
        id="panel-configuration"
        role="tabpanel"
        aria-labelledby="tab-configuration"
      >
        <p class="muted">
          Read-only. There is no environment edit API.
        </p>
        <dl class="dl">
          <dt>Slug</dt>
          <dd>{{ env?.slug }}</dd>
          <dt>Host port</dt>
          <dd>{{ env?.hostPort ?? '—' }}</dd>
          <dt>Health URL</dt>
          <dd>{{ env?.healthUrl }}</dd>
          <dt>Compose file</dt>
          <dd>{{ env?.composeFile }}</dd>
          <dt>Compose project</dt>
          <dd>{{ env?.composeProject || '—' }}</dd>
          <dt>Env file</dt>
          <dd>{{ env?.envFileLocal }}</dd>
          <dt>SQLite volume</dt>
          <dd>{{ env?.sqliteVolume }}</dd>
          <dt>Assets volume</dt>
          <dd>{{ env?.assetsVolume }}</dd>
          <dt>Isolation marker</dt>
          <dd>{{ env?.isolationMarker }}</dd>
          <dt>Lifecycle</dt>
          <dd>{{ env?.lifecycleStatus || '—' }}</dd>
        </dl>
        <form
          v-if="!decommissioned"
          class="card"
          @submit.prevent="decommission"
        >
          <p>
            This stops and removes the process only. Volumes stay. This is not Stop. It never runs compose down -v.
          </p>
          <label>
            <input
              v-model="confirmDecommission"
              type="checkbox"
            >
            I understand volumes stay and data is not deleted.
          </label>
          <button
            type="submit"
            class="secondary"
            :disabled="!confirmDecommission || decommissioning || !env"
            :aria-busy="decommissioning"
          >
            {{ decommissioning ? 'Decommissioning…' : 'Decommission' }}
          </button>
        </form>
        <p
          v-else
          class="muted"
        >
          This environment is decommissioned. Volumes were left in place.
        </p>
      </section>
    </AppAsyncPanel>
  </main>
</template>
