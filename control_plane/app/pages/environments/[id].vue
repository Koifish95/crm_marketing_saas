<script setup lang="ts">
const route = useRoute()
const { error, pending, refreshing, environments, checkedAt, refreshStatus } = await useFleetStatus()
const tab = ref('overview')
const relaunching = ref(false)
const actionError = ref('')
const environmentId = computed(() => String(route.params.id || ''))
const env = computed(() => environments.value.find(row => row.id === environmentId.value) ?? null)

useHead({ title: computed(() => env.value?.headline || 'Environment') })

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
</script>

<template>
  <main class="page">
    <AppPageHeader
      :title="env?.headline || 'Environment'"
      :crumbs="[{ to: '/environments', label: 'Environments' }, { label: env?.type || 'Record' }]"
    >
      <template #actions>
        <button
          type="button"
          class="secondary"
          :disabled="pending || refreshing"
          @click="refreshStatus"
        >
          Refresh
        </button>
        <button
          type="button"
          :disabled="relaunching || !env"
          @click="relaunch"
        >
          {{ relaunching ? 'Relaunching…' : 'Relaunch' }}
        </button>
      </template>
      Last checked {{ checkedAt || '—' }}.
    </AppPageHeader>
    <p
      v-if="actionError"
      class="muted"
    >
      {{ actionError }}
    </p>
    <p
      v-if="pending && !env"
      class="muted"
    >
      Loading…
    </p>
    <p
      v-else-if="error || !env"
      class="muted"
    >
      Environment not found in the current registry.
    </p>
    <template v-else>
      <AppWorkspaceTabs
        v-model="tab"
        :tabs="[
          { id: 'overview', label: 'Overview' },
          { id: 'runtime', label: 'Runtime / Health' },
          { id: 'configuration', label: 'Configuration' },
        ]"
      />
      <section
        v-if="tab === 'overview'"
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
      >
        <dl class="dl">
          <dt>Environment ID</dt>
          <dd>{{ env.id }}</dd>
          <dt>Customer</dt>
          <dd>
            <NuxtLink :to="`/customers/${env.customer.id}`">
              {{ env.customer.displayName }}
            </NuxtLink>
          </dd>
          <dt>Type</dt>
          <dd>{{ env.type }}</dd>
          <dt>Hosting node</dt>
          <dd>
            <NuxtLink :to="`/nodes/${env.node.id}`">
              {{ env.node.name }}
            </NuxtLink>
          </dd>
          <dt>Container</dt>
          <dd>{{ env.containerName }}</dd>
          <dt>Image</dt>
          <dd>{{ env.expectedImage }}</dd>
          <dt>Status</dt>
          <dd><AppStatusBadge :status="env.status" /></dd>
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
          <dd>{{ env.runtime }}</dd>
          <dt>Combined status</dt>
          <dd><AppStatusBadge :status="env.status" /></dd>
          <dt>Application health</dt>
          <dd>{{ env.healthOk ? 'ok' : (env.healthError || 'not ok') }}</dd>
          <dt>Database health</dt>
          <dd>{{ env.healthOk ? 'reachable' : 'not confirmed' }}</dd>
          <dt>Last checked</dt>
          <dd>{{ checkedAt || '—' }}</dd>
          <dt>Access URL</dt>
          <dd>
            <a
              :href="env.accessUrl"
              target="_blank"
              rel="noreferrer"
            >Open</a>
            <span class="muted"> {{ env.accessUrl }}</span>
          </dd>
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
          <dd>{{ env.slug }}</dd>
          <dt>Host port</dt>
          <dd>{{ env.hostPort ?? '—' }}</dd>
          <dt>Health URL</dt>
          <dd>{{ env.healthUrl }}</dd>
          <dt>Compose file</dt>
          <dd>{{ env.composeFile }}</dd>
          <dt>Compose project</dt>
          <dd>{{ env.composeProject || '—' }}</dd>
          <dt>Env file</dt>
          <dd>{{ env.envFileLocal }}</dd>
          <dt>SQLite volume</dt>
          <dd>{{ env.sqliteVolume }}</dd>
          <dt>Assets volume</dt>
          <dd>{{ env.assetsVolume }}</dd>
          <dt>Isolation marker</dt>
          <dd>{{ env.isolationMarker }}</dd>
          <dt>Lifecycle</dt>
          <dd>{{ env.lifecycleStatus || '—' }}</dd>
        </dl>
      </section>
    </template>
  </main>
</template>
