<script setup lang="ts">
import { findById, isStartableEnvironment, isStoppableEnvironment, operatorEnvironmentStatus, pollFleetUntilHealthy, FLEET_PROVISION_POLL_ATTEMPTS, FLEET_PROVISION_POLL_MS, type FleetStatusResponse } from '~~/shared/utils/fleet'
import {
  formatBackupCreatedAt,
  formatBackupCreatedNotice,
  formatBackupSize,
  formatOffhostCopyNotice,
  formatRestoreBackupOption,
  type FleetBackupSummary,
  type RestoreBackupCandidate,
} from '~~/shared/utils/fleet-backup'
import { ENVIRONMENT_TABS } from '~~/shared/utils/nav'
import { isRetryableLifecycle } from '~~/shared/utils/provision'

const route = useRoute()
const { error, pending, refreshing, environments, checkedAt, refreshStatus, applyStatus } = await useFleetStatus()
const tab = ref('overview')
const relaunching = ref(false)
const retrying = ref(false)
const decommissioning = ref(false)
const archiving = ref(false)
const confirmArchiveSlug = ref('')
const confirmArchivePhrase = ref('')
const skipOffhost = ref(false)
const showArchiveDialog = ref(false)
const backingUp = ref(false)
const restoring = ref(false)
const copying = ref(false)
const revealing = ref(false)
const upgrading = ref(false)
const targetImage = ref('')
const stopping = ref(false)
const starting = ref(false)
const assigningHostname = ref(false)
const hostnameDraft = ref('')
const confirmRestore = ref(false)
const confirmStop = ref(false)
const destinationDir = ref('')
const confirmDecommission = ref(false)
const actionError = ref('')
const actionNotice = ref('')
const restoreBackups = ref<RestoreBackupCandidate[]>([])
const restoreTargetLabel = ref('')
const sourceEnvironmentId = ref('')
const selectedBackupId = ref('')
const loadingBackups = ref(false)
const environmentId = computed(() => String(route.params.id || ''))
const env = computed(() => findById(environments.value, environmentId.value))
const decommissioned = computed(() => env.value?.lifecycleStatus === 'decommissioned')
const archived = computed(() => env.value?.lifecycleStatus === 'archived')
const retired = computed(() => decommissioned.value || archived.value)
const retryable = computed(() => isRetryableLifecycle(env.value?.lifecycleStatus))
const provisioning = computed(() => env.value?.lifecycleStatus === 'provisioning')
const operatorStatus = computed(() => env.value ? operatorEnvironmentStatus(env.value) : 'unknown')
const canStop = computed(() => Boolean(env.value && isStoppableEnvironment(env.value)))
const canStart = computed(() => Boolean(env.value && isStartableEnvironment(env.value)))
const restoreSources = computed(() => {
  const seen = new Map<string, RestoreBackupCandidate['source']>()
  for (const backup of restoreBackups.value) {
    if (!seen.has(backup.source.environmentId)) {
      seen.set(backup.source.environmentId, backup.source)
    }
  }
  return [...seen.values()]
})
const backupsForSource = computed(() => restoreBackups.value.filter(backup => (
  backup.source.environmentId === sourceEnvironmentId.value
)))
const selectedBackup = computed(() => (
  restoreBackups.value.find(backup => backup.id === selectedBackupId.value) ?? null
))
const selectedSource = computed(() => (
  restoreSources.value.find(source => source.environmentId === sourceEnvironmentId.value) ?? null
))

watch(() => env.value?.expectedImage, (value) => {
  if (value && !upgrading.value) {
    targetImage.value = value
  }
}, { immediate: true })

async function loadRestorableBackups() {
  if (!env.value) {
    restoreBackups.value = []
    restoreTargetLabel.value = ''
    return
  }
  loadingBackups.value = true
  try {
    const result = await $fetch<{
      target: { displayName: string, type: string, productDisplayName: string, customerDisplayName: string }
      backups: RestoreBackupCandidate[]
    }>(`/api/environments/${env.value.id}/backups`)
    restoreBackups.value = result.backups
    restoreTargetLabel.value = `${result.target.customerDisplayName} · ${result.target.productDisplayName} · ${result.target.type}`
    const previousBackup = selectedBackupId.value
    if (previousBackup && !result.backups.some(backup => backup.id === previousBackup)) {
      selectedBackupId.value = ''
      confirmRestore.value = false
      actionError.value = 'The selected backup is no longer available. Choose a backup again.'
    }
    if (!sourceEnvironmentId.value || !result.backups.some(backup => backup.source.environmentId === sourceEnvironmentId.value)) {
      const prod = restoreSources.value.find(source => source.type === 'PROD')
        || result.backups.find(backup => backup.source.type === 'PROD')?.source
      sourceEnvironmentId.value = prod?.environmentId
        || result.backups.find(backup => backup.source.environmentId === env.value?.id)?.source.environmentId
        || result.backups[0]?.source.environmentId
        || ''
    }
  } catch (error) {
    restoreBackups.value = []
    actionError.value = fetchMessage(error, 'Could not load backups.')
  } finally {
    loadingBackups.value = false
  }
}

watch(environmentId, () => {
  sourceEnvironmentId.value = ''
  selectedBackupId.value = ''
  confirmRestore.value = false
})

watch(() => env.value?.id, (id) => {
  if (id) {
    hostnameDraft.value = env.value?.publicHostname || ''
    void loadRestorableBackups()
  }
}, { immediate: true })

watch(sourceEnvironmentId, () => {
  if (selectedBackupId.value && !backupsForSource.value.some(backup => backup.id === selectedBackupId.value)) {
    selectedBackupId.value = ''
    confirmRestore.value = false
  }
})

useHead({
  title: computed(() => env.value
    ? `Environment · ${env.value.customer.displayName} · ${env.value.type}`
    : 'Environment'),
})

async function relaunch() {
  if (!env.value || relaunching.value) {
    return
  }
  relaunching.value = true
  actionError.value = ''
  actionNotice.value = 'Relaunching this environment. Docker is recreating the container. This can take a minute.'
  try {
    const result = await $fetch<FleetStatusResponse>(`/api/environments/${env.value.id}/relaunch`, { method: 'POST' })
    if (result.checkedAt && result.environments) {
      applyStatus({ checkedAt: result.checkedAt, environments: result.environments })
    }
    if (env.value?.status !== 'healthy') {
      actionNotice.value = 'Waiting for the app health check…'
      const outcome = await pollFleetUntilHealthy({
        isHealthy: () => findById(environments.value, environmentId.value)?.status === 'healthy',
        refresh: refreshStatus,
      })
      if (outcome === 'timeout') {
        actionNotice.value = 'Relaunch finished, but health did not come up yet. Use Refresh to check again.'
        return
      }
    }
    actionNotice.value = `Relaunch finished. Status is ${env.value?.status || 'unknown'}.`
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Relaunch failed.')
  } finally {
    relaunching.value = false
  }
}

async function startEnvironment() {
  if (!env.value || starting.value || !canStart.value) {
    return
  }
  starting.value = true
  actionError.value = ''
  actionNotice.value = 'Starting this environment. Same volumes and identity. This is not Relaunch.'
  try {
    const result = await $fetch<FleetStatusResponse>(`/api/environments/${env.value.id}/start`, { method: 'POST' })
    if (result.checkedAt && result.environments) {
      applyStatus({ checkedAt: result.checkedAt, environments: result.environments })
    }
    if (env.value?.status !== 'healthy') {
      actionNotice.value = 'Waiting for the app health check…'
      const outcome = await pollFleetUntilHealthy({
        isHealthy: () => findById(environments.value, environmentId.value)?.status === 'healthy',
        refresh: refreshStatus,
      })
      if (outcome === 'timeout') {
        actionNotice.value = 'Start finished, but health did not come up yet. Use Refresh to check again.'
        return
      }
    }
    actionNotice.value = `Start finished. Status is ${env.value?.status || 'unknown'}.`
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Start failed.')
  } finally {
    starting.value = false
  }
}

async function assignHostname() {
  if (!env.value || assigningHostname.value || env.value.type !== 'PROD') {
    return
  }
  assigningHostname.value = true
  actionError.value = ''
  actionNotice.value = 'Saving public hostname and regenerating the production edge…'
  try {
    const result = await $fetch<{
      hostname: { hostname: string, publicOrigin: string, relaunchError?: string | null }
      checkedAt: string
      environments: FleetStatusResponse['environments']
    }>(`/api/environments/${env.value.id}/hostname`, {
      method: 'POST',
      body: { hostname: hostnameDraft.value, relaunch: true },
    })
    if (result.checkedAt && result.environments) {
      applyStatus({ checkedAt: result.checkedAt, environments: result.environments })
    }
    hostnameDraft.value = result.hostname.hostname
    if (result.hostname.relaunchError) {
      actionNotice.value = `Hostname saved as ${result.hostname.publicOrigin}. Relaunch needed: ${result.hostname.relaunchError}`
      return
    }
    actionNotice.value = `Public origin is ${result.hostname.publicOrigin}. Edge config was rewritten from this hostname.`
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Could not save the public hostname.')
  } finally {
    assigningHostname.value = false
  }
}

async function stopEnvironment() {
  if (!env.value || !confirmStop.value || stopping.value) {
    return
  }
  stopping.value = true
  actionError.value = ''
  actionNotice.value = 'Stopping this environment. Volumes stay. This is not Decommission.'
  try {
    const result = await $fetch<FleetStatusResponse>(`/api/environments/${env.value.id}/stop`, { method: 'POST' })
    if (result.checkedAt && result.environments) {
      applyStatus({ checkedAt: result.checkedAt, environments: result.environments })
    }
    if (env.value?.status !== 'stopped') {
      const outcome = await pollFleetUntilHealthy({
        isHealthy: () => findById(environments.value, environmentId.value)?.status === 'stopped',
        refresh: refreshStatus,
      })
      if (outcome === 'timeout') {
        actionNotice.value = 'Stop finished, but status is not stopped yet. Use Refresh to check again.'
        return
      }
    }
    actionNotice.value = 'Environment stopped. Persistent volumes stay. Use Start to resume it.'
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Stop failed.')
  } finally {
    stopping.value = false
  }
}

async function retryProvision() {
  if (!env.value) {
    return
  }
  retrying.value = true
  actionError.value = ''
  actionNotice.value = 'Retry accepted. Continuing this environment. Same volumes. Image build can take several minutes.'
  try {
    await $fetch(`/api/environments/${env.value.id}/provision`, { method: 'POST' })
    await refreshWorkspace()
    const outcome = await pollFleetUntilHealthy({
      isHealthy: () => findById(environments.value, environmentId.value)?.lifecycleStatus !== 'provisioning',
      refresh: refreshStatus,
      attempts: FLEET_PROVISION_POLL_ATTEMPTS,
      delayMs: FLEET_PROVISION_POLL_MS,
    })
    const current = findById(environments.value, environmentId.value)
    if (outcome === 'timeout' && current?.lifecycleStatus === 'provisioning') {
      actionNotice.value = 'Still provisioning. Refresh this page. Retry remains available if it stays Provisioning or becomes Failed.'
      return
    }
    if (current?.lifecycleStatus === 'failed') {
      actionNotice.value = ''
      actionError.value = current.provisionError || 'Provisioning failed.'
      return
    }
    actionNotice.value = `Provisioning finished. Status is ${current ? operatorEnvironmentStatus(current) : 'unknown'}.`
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Retry failed.')
    await refreshWorkspace()
  } finally {
    retrying.value = false
  }
}

async function backupEnvironment() {
  if (!env.value || backingUp.value) {
    return
  }
  backingUp.value = true
  actionError.value = ''
  actionNotice.value = 'Creating the same-host backup…'
  try {
    const result = await $fetch<{ backup: FleetBackupSummary }>(`/api/environments/${env.value.id}/backup`, {
      method: 'POST',
    })
    await refreshWorkspace()
    await loadRestorableBackups()
    const timezone = env.value.customer.timezone
    actionNotice.value = formatBackupCreatedNotice({
      zipPath: result.backup.zipPath,
      createdAt: formatBackupCreatedAt(result.backup.createdAt, timezone),
    })
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Backup failed.')
  } finally {
    backingUp.value = false
  }
}

async function revealBackup() {
  if (!env.value?.lastBackup) {
    return
  }
  revealing.value = true
  actionError.value = ''
  actionNotice.value = ''
  try {
    await $fetch(`/api/environments/${env.value.id}/backup/reveal`, {
      method: 'POST',
      body: { backupId: env.value.lastBackup.id },
    })
    actionNotice.value = 'Opened the backup folder in File Explorer.'
  } catch (error) {
    actionError.value = fetchMessage(error, 'Could not open the backup folder.')
  } finally {
    revealing.value = false
  }
}

async function copyOffhost() {
  if (!env.value || copying.value) {
    return
  }
  copying.value = true
  actionError.value = ''
  actionNotice.value = 'Copying the backup zip to the off-host folder…'
  try {
    const result = await $fetch<{ backup: FleetBackupSummary }>(`/api/environments/${env.value.id}/backup/copy`, {
      method: 'POST',
      body: { destinationDir: destinationDir.value },
    })
    await refreshWorkspace()
    actionNotice.value = formatOffhostCopyNotice(result.backup)
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Off-host copy failed.')
  } finally {
    copying.value = false
  }
}

async function restoreEnvironment() {
  if (!env.value || !confirmRestore.value || !selectedBackupId.value) {
    return
  }
  if (!selectedBackup.value?.available) {
    actionError.value = 'The selected backup is no longer available. Choose a backup again.'
    selectedBackupId.value = ''
    confirmRestore.value = false
    await loadRestorableBackups()
    return
  }
  restoring.value = true
  actionError.value = ''
  actionNotice.value = ''
  try {
    const result = await $fetch<{ kind: string, backupId: string }>(`/api/environments/${env.value.id}/restore`, {
      method: 'POST',
      body: { confirm: true, backupId: selectedBackupId.value },
    })
    await refreshWorkspace()
    await loadRestorableBackups()
    confirmRestore.value = false
    const kind = result.kind === 'copy-down' ? 'copy-down' : 'rollback'
    actionNotice.value = `Restore finished (${kind}). This environment’s data was replaced. Identity stayed.`
  } catch (error) {
    actionError.value = fetchMessage(error, 'Restore failed.')
    await loadRestorableBackups()
    if (selectedBackupId.value && !restoreBackups.value.some(backup => backup.id === selectedBackupId.value)) {
      selectedBackupId.value = ''
      confirmRestore.value = false
    }
  } finally {
    restoring.value = false
  }
}

async function upgradeEnvironment() {
  if (!env.value) {
    return
  }
  upgrading.value = true
  actionError.value = ''
  actionNotice.value = ''
  try {
    const result = await $fetch<{
      previousImage: string
      expectedImage: string
      backupId: string
      releaseId?: string | null
      schemaVersion?: string | null
    }>(`/api/environments/${env.value.id}/upgrade`, {
      method: 'POST',
      body: { expectedImage: targetImage.value.trim() || undefined },
    })
    await refreshWorkspace()
    actionNotice.value = [
      `Upgrade finished.`,
      `${result.previousImage} → ${result.expectedImage}.`,
      `Backup ${result.backupId}.`,
      `Release ${result.releaseId || '—'}.`,
      `Schema ${result.schemaVersion || '—'}.`,
    ].join(' ')
  } catch (error) {
    actionError.value = fetchMessage(error, 'Upgrade failed.')
    await refreshWorkspace()
  } finally {
    upgrading.value = false
  }
}

async function decommission() {
  if (!env.value || !confirmDecommission.value) {
    return
  }
  decommissioning.value = true
  actionError.value = ''
  actionNotice.value = ''
  try {
    await $fetch(`/api/environments/${env.value.id}/decommission`, { method: 'POST' })
    await refreshWorkspace()
    actionNotice.value = 'Decommissioned. Process is gone. Volumes stay. This is not Archive & Delete.'
  } catch (error) {
    actionError.value = fetchMessage(error, 'Decommission failed.')
  } finally {
    decommissioning.value = false
  }
}

async function archiveEnvironment() {
  if (!env.value || archiving.value) {
    return
  }
  archiving.value = true
  actionError.value = ''
  actionNotice.value = 'Archive & Delete: final backup, then exact volume removal…'
  try {
    await $fetch(`/api/environments/${env.value.id}/archive`, {
      method: 'POST',
      body: {
        confirmSlug: confirmArchiveSlug.value,
        confirmPhrase: confirmArchivePhrase.value,
        destinationDir: destinationDir.value || undefined,
        skipOffhost: env.value.type === 'PROD' ? false : skipOffhost.value,
        note: 'Operator Archive & Delete',
      },
    })
    showArchiveDialog.value = false
    await refreshWorkspace()
    actionNotice.value = 'Archived. Live volumes were removed. The Control Plane row and final backup remain.'
  } catch (error) {
    actionError.value = fetchMessage(error, 'Archive & Delete failed.')
  } finally {
    archiving.value = false
  }
}

const { data: history, refresh: refreshHistory } = await useFetch<{ events: { id: string, createdAt: string, action: string, summary: string }[] }>(
  () => `/api/events?environmentId=${environmentId.value}&limit=40`,
)

async function refreshWorkspace() {
  await Promise.all([refreshStatus(), refreshHistory()])
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
          @refresh="refreshWorkspace"
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
          :disabled="relaunching || !env || retired || retryable"
          :aria-busy="relaunching"
          @click="relaunch"
        >
          {{ relaunching ? 'Relaunching…' : 'Relaunch' }}
        </button>
      </template>
      Last checked {{ checkedAt || '—' }}.
      <template v-if="provisioning">
        Provisioning in progress. Status is stored on the server. You can leave this page.
      </template>
      <template v-else-if="retryable">
        Retry continues the existing environment and remounts the same volumes. It does not delete volumes.
      </template>
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
          <dt>Product</dt>
          <dd>{{ env?.productInstance?.displayName || '—' }}</dd>
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
          <dt>Running image</dt>
          <dd>{{ env?.runningImage?.imageName || '—' }}</dd>
          <dt>Release ID</dt>
          <dd>{{ env?.releaseId || '—' }}</dd>
          <dt>Schema version</dt>
          <dd>{{ env?.schemaVersion || '—' }}</dd>
          <dt>Status</dt>
          <dd><AppStatusBadge :status="operatorStatus" /></dd>
          <dt>Lifecycle</dt>
          <dd>{{ env?.lifecycleStatus || '—' }}</dd>
          <dt>Provision error</dt>
          <dd>{{ env?.provisionError || '—' }}</dd>
          <dt>Access URL</dt>
          <dd><AppAccessLink :href="env?.accessUrl" /></dd>
          <dt>Public hostname</dt>
          <dd>
            <template v-if="env?.type === 'PROD' && !decommissioned">
              <form
                class="hostname-form"
                @submit.prevent="assignHostname"
              >
                <input
                  v-model="hostnameDraft"
                  type="text"
                  name="hostname"
                  autocomplete="off"
                  placeholder="ma-test.example.com"
                  :disabled="assigningHostname"
                >
                <button
                  type="submit"
                  :disabled="assigningHostname || !hostnameDraft.trim()"
                  :aria-busy="assigningHostname"
                >
                  {{ assigningHostname ? 'Saving…' : 'Save hostname' }}
                </button>
              </form>
              <p class="muted">
                One source of truth. nginx, HTTPS origin, Secure cookies, and CSRF all use
                <code>https://{{ hostnameDraft || env.publicHostname || 'hostname' }}</code>.
                Temporary SIC names such as ma-test.strategicinsightsconsulting.net are configuration, not architecture.
              </p>
            </template>
            <template v-else>
              {{ env?.publicHostname || 'Not assigned. Loopback access only.' }}
            </template>
          </dd>
          <dt>Public origin</dt>
          <dd>{{ env?.publicOrigin || '—' }}</dd>
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
          <dd><AppStatusBadge :status="operatorStatus" /></dd>
          <dt>Application health</dt>
          <dd>{{ env?.healthOk ? 'ok' : (env?.healthError || 'not ok') }}</dd>
          <dt>Last checked</dt>
          <dd>{{ checkedAt || '—' }}</dd>
          <dt>Access URL</dt>
          <dd><AppAccessLink :href="env?.accessUrl" /></dd>
        </dl>
        <div class="card">
          <p>
            Start resumes this registered environment with the same image, volumes, ports, and identity. It does not rebuild. Missing containers need Relaunch.
          </p>
          <button
            type="button"
            :disabled="starting || !canStart"
            :aria-busy="starting"
            @click="startEnvironment"
          >
            {{ starting ? 'Starting…' : 'Start' }}
          </button>
        </div>
        <form
          class="card"
          @submit.prevent="stopEnvironment"
        >
          <p>
            Stop halts this environment’s process only. Volumes, backups, and identity stay. This is not Decommission. Use Start to resume it.
          </p>
          <label>
            <input
              v-model="confirmStop"
              type="checkbox"
            >
            I understand this stops the running application.
          </label>
          <button
            type="submit"
            class="secondary"
            :disabled="!confirmStop || stopping || !canStop"
            :aria-busy="stopping"
          >
            {{ stopping ? 'Stopping…' : 'Stop Environment' }}
          </button>
        </form>
      </section>
      <section
        v-else-if="tab === 'backup'"
        id="panel-backup"
        role="tabpanel"
        aria-labelledby="tab-backup"
      >
        <p class="muted">
          Backup and restore replace this environment’s data only. Choose a specific backup. Same-product PROD → DEV copy-down is allowed. DEV → PROD is not. Siblings stay. Volumes are not deleted. Retry continues provision; upgrade is a separate gated action.
        </p>
        <dl class="dl">
          <dt>Last backup</dt>
          <dd v-if="env?.lastBackup">
            {{ formatBackupCreatedAt(env.lastBackup.createdAt, env.customer.timezone) }}
            <div class="muted">
              {{ env.lastBackup.createdAt }}
            </div>
          </dd>
          <dd v-else>
            none
          </dd>
          <dt>Size</dt>
          <dd>{{ env?.lastBackup ? formatBackupSize(env.lastBackup.bytes) : '—' }}</dd>
          <dt>Same-host zip</dt>
          <dd>
            <button
              v-if="env?.lastBackup?.zipPath"
              type="button"
              class="path-link"
              :disabled="revealing"
              :aria-busy="revealing"
              @click="revealBackup"
            >
              {{ env.lastBackup.zipPath }}
            </button>
            <template v-else>
              —
            </template>
          </dd>
          <dt>Off-host copy</dt>
          <dd>{{ env?.lastBackup?.offhostPath || 'not copied' }}</dd>
        </dl>
        <div class="card">
          <button
            type="button"
            :disabled="backingUp || !env || decommissioned"
            :aria-busy="backingUp"
            @click="backupEnvironment"
          >
            {{ backingUp ? 'Backing up…' : 'Backup' }}
          </button>
        </div>
        <form
          class="card"
          @submit.prevent="copyOffhost"
        >
          <label>
            Off-host folder
            <input
              v-model="destinationDir"
              placeholder="Existing folder path"
            >
          </label>
          <button
            type="submit"
            :disabled="copying || !env || decommissioned || !destinationDir.trim()"
            :aria-busy="copying"
          >
            {{ copying ? 'Copying…' : 'Copy off-host' }}
          </button>
        </form>
        <form
          class="card"
          @submit.prevent="restoreEnvironment"
        >
          <p>
            Restore replaces <strong>this</strong> environment’s data. Target identity, port, container, compose, and secrets stay. Siblings stay. It never runs compose down -v. Copy-down is PROD → DEV only, never DEV → PROD.
          </p>
          <dl class="dl">
            <dt>Target</dt>
            <dd>{{ restoreTargetLabel || (env ? `${env.customer.displayName} · ${env.productInstance?.displayName || ''} · ${env.type}` : '—') }}</dd>
          </dl>
          <label>
            Source environment
            <select
              v-model="sourceEnvironmentId"
              :disabled="loadingBackups || restoring || decommissioned || restoreSources.length === 0"
            >
              <option
                v-if="restoreSources.length === 0"
                value=""
              >
                {{ loadingBackups ? 'Loading backups…' : 'No restorable backups' }}
              </option>
              <option
                v-for="source in restoreSources"
                :key="source.environmentId"
                :value="source.environmentId"
              >
                {{ source.productDisplayName }} {{ source.type }}
              </option>
            </select>
          </label>
          <label>
            Backup
            <select
              v-model="selectedBackupId"
              :disabled="loadingBackups || restoring || decommissioned || backupsForSource.length === 0"
            >
              <option value="">
                {{ backupsForSource.length === 0 ? 'No backups for this source' : 'Select a backup' }}
              </option>
              <option
                v-for="backup in backupsForSource"
                :key="backup.id"
                :value="backup.id"
                :disabled="!backup.available"
              >
                {{ formatRestoreBackupOption(backup, env?.customer.timezone || 'UTC') }}{{ backup.available ? '' : ' (missing)' }}
              </option>
            </select>
          </label>
          <p
            v-if="selectedBackup"
            class="muted"
          >
            {{ selectedBackup.kind === 'copy-down' ? 'Copy-down' : 'Rollback' }} from
            {{ selectedSource?.productDisplayName }} {{ selectedSource?.type }}
            into {{ env?.productInstance?.displayName }} {{ env?.type }}.
            This replaces the target environment’s SQLite and persistent uploads, including Sales proposal PDFs.
          </p>
          <label>
            <input
              v-model="confirmRestore"
              type="checkbox"
            >
            I understand this replaces this environment’s data.
          </label>
          <button
            type="submit"
            class="secondary"
            :disabled="!confirmRestore || restoring || !env || retired || !selectedBackup?.available"
            :aria-busy="restoring"
          >
            {{ restoring ? 'Restoring…' : 'Restore' }}
          </button>
        </form>
        <form
          v-if="!retired"
          class="card"
          @submit.prevent="decommission"
        >
          <p>
            <strong>Decommission</strong> removes the process. Volumes stay. Start/Relaunch are blocked. This is not Archive & Delete.
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
          >
            {{ decommissioning ? 'Decommissioning…' : 'Decommission process' }}
          </button>
        </form>
        <div
          v-if="!archived"
          class="card"
        >
          <p>
            <strong>Archive & Delete</strong> is final retirement of live data. It creates a final backup, copies off-host when required, removes the exact registered container, then removes only this environment’s sqlite and assets volumes. The Control Plane row remains. Siblings stay. Never prune. Never compose down -v.
          </p>
          <button
            type="button"
            class="danger"
            :disabled="!env"
            @click="showArchiveDialog = true"
          >
            Archive & Delete…
          </button>
        </div>
        <p
          v-else
          class="muted"
        >
          Archived {{ env?.archivedAt }}. Final backup {{ env?.finalBackupId }}. Data removed {{ env?.dataRemovedAt }}.
        </p>
      </section>
      <section
        v-else-if="tab === 'release'"
        id="panel-release"
        role="tabpanel"
        aria-labelledby="tab-release"
      >
        <p class="muted">
          Safe path: backup DEV → upgrade DEV → validate → backup PROD → upgrade PROD → validate. No mass deploy. Rollback is Restore plus the previous image — do not downgrade SQLite.
        </p>
        <dl class="dl">
          <dt>Expected image</dt>
          <dd>{{ env?.expectedImage }}</dd>
          <dt>Running image</dt>
          <dd>{{ env?.runningImage?.imageName || '—' }}</dd>
          <dt>Release ID</dt>
          <dd>{{ env?.releaseId || '—' }}</dd>
          <dt>Schema</dt>
          <dd>{{ env?.schemaVersion || '—' }}</dd>
          <dt>Last backup</dt>
          <dd>{{ env?.lastBackup ? formatBackupCreatedAt(env.lastBackup.createdAt, env.customer.timezone) : 'none — backup before PROD upgrade' }}</dd>
        </dl>
        <form
          class="card"
          @submit.prevent="upgradeEnvironment"
        >
          <p class="muted">
            Upgrade rebuilds the local image, recreates the app container, and remounts the same volumes. Requires an S6 backup of this environment. Non-PROD first when the customer has one. Rollback is Restore plus the previous image — do not downgrade SQLite.
          </p>
          <label>
            Target image
            <input
              v-model="targetImage"
              type="text"
              name="expectedImage"
              autocomplete="off"
              :disabled="upgrading || decommissioned"
            >
          </label>
          <button
            type="submit"
            :disabled="upgrading || !env || decommissioned || !targetImage.trim()"
            :aria-busy="upgrading"
          >
            {{ upgrading ? 'Upgrading…' : 'Upgrade' }}
          </button>
        </form>
      </section>
      <section
        v-else-if="tab === 'network'"
        id="panel-network"
        role="tabpanel"
        aria-labelledby="tab-network"
      >
        <p class="muted">
          Live TLS issuance is official S8 / external. This page shows hostname configuration the Control Plane actually stores. It does not probe certificate expiry.
        </p>
        <dl class="dl">
          <dt>Access URL</dt>
          <dd><AppAccessLink :href="env?.accessUrl" /></dd>
          <dt>Host port</dt>
          <dd>{{ env?.hostPort ?? '—' }}</dd>
          <dt>Public hostname</dt>
          <dd>{{ env?.publicHostname || env?.formerPublicHostname || 'Not assigned. Loopback access only.' }}</dd>
          <dt>Public origin</dt>
          <dd>{{ env?.publicOrigin || '—' }}</dd>
          <dt>Edge / TLS</dt>
          <dd>{{ env?.publicHostname ? 'Hostname saved; nginx templates regenerate. Live certificate status is unknown until DNS/TLS exist.' : 'No public hostname.' }}</dd>
        </dl>
      </section>
      <section
        v-else-if="tab === 'history'"
        id="panel-history"
        role="tabpanel"
        aria-labelledby="tab-history"
      >
        <p
          v-if="!history?.events?.length"
          class="muted"
        >
          No events recorded for this environment yet.
        </p>
        <AppDataTable
          v-else
          label="Environment history"
          :columns="['When', 'Action', 'Summary']"
        >
          <tr
            v-for="event in history.events"
            :key="event.id"
          >
            <td>{{ event.createdAt }}</td>
            <td>{{ event.action }}</td>
            <td>{{ event.summary }}</td>
          </tr>
        </AppDataTable>
        <dl class="dl">
          <dt>Slug</dt>
          <dd>{{ env?.slug }}</dd>
          <dt>Container</dt>
          <dd>{{ env?.containerName }}</dd>
          <dt>SQLite volume</dt>
          <dd>{{ env?.sqliteVolume }}</dd>
          <dt>Assets volume</dt>
          <dd>{{ env?.assetsVolume }}</dd>
          <dt>Compose</dt>
          <dd>{{ env?.composeFile }}</dd>
        </dl>
      </section>
      <AppConfirmDialog
        v-if="showArchiveDialog"
        title="Archive & Delete this environment?"
        confirm-label="Archive & Delete"
        danger
        :phrase="env?.slug"
        confirm-text="Type the environment slug"
        second-phrase="ARCHIVE AND DELETE"
        second-confirm-text="Type ARCHIVE AND DELETE"
        @cancel="showArchiveDialog = false"
        @confirm="confirmArchiveSlug = env?.slug || ''; confirmArchivePhrase = 'ARCHIVE AND DELETE'; archiveEnvironment()"
      >
        <p>This will stop the process if needed, create a final backup, copy it off-host unless you skip that for non-PROD, then delete only {{ env?.sqliteVolume }} and {{ env?.assetsVolume }}.</p>
        <p>The Control Plane history row remains. Sibling environments are not touched. Type the slug <strong>{{ env?.slug }}</strong>.</p>
        <label v-if="env?.type !== 'PROD'">
          Off-host folder (optional if skipping)
          <input
            v-model="destinationDir"
            placeholder="Existing folder path"
          >
        </label>
        <label v-else>
          Off-host folder (required for PROD)
          <input
            v-model="destinationDir"
            placeholder="Existing folder path"
          >
        </label>
        <label v-if="env?.type !== 'PROD'">
          <input
            v-model="skipOffhost"
            type="checkbox"
          >
          Skip off-host copy for this non-PROD environment
        </label>
      </AppConfirmDialog>
    </AppAsyncPanel>
  </main>
</template>
