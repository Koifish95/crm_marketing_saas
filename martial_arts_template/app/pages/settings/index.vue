<script setup lang="ts">
import { listSettingsSections } from '@crm/core/shared/utils/settings-registry'
import {
  ALLOW_EARLY_TRIAL_OUTCOMES_DESCRIPTION,
  ALLOW_EARLY_TRIAL_OUTCOMES_LABEL,
} from '#shared/utils/trial-outcomes'
import {
  COMPENSATION_TRACKED_OWNER_DESCRIPTION,
  COMPENSATION_TRACKED_OWNER_LABEL,
} from '#shared/utils/compensation'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Settings',
})

interface SystemStatus {
  app: string
  timezone: string
  appEnv: string
  nodeEnv: string
  uptimeSeconds: number
  restartEnabled: boolean
}

interface AppSettings {
  allowEarlyTrialOutcomes: boolean
  key: string
  label: string
  description: string
  trackedAcquisitionOwnerUserId: number | null
  trackedAcquisitionOwner: { id: number, displayName: string } | null
  trackedAcquisitionOwnerKey: string
  trackedAcquisitionOwnerLabel: string
  trackedAcquisitionOwnerDescription: string
}

const errorMessage = ref('')
const notice = ref('')
const settingError = ref('')
const settingNotice = ref('')
const confirmRestart = ref(false)
const confirmShutdown = ref(false)
const pendingRestart = ref(false)
const pendingShutdown = ref(false)
const pendingSetting = ref(false)
const pendingCompensationSetting = ref(false)

const { data: status, error, refresh } = await useFetch<SystemStatus>('/api/admin/system/status')
const {
  data: appSettings,
  error: settingsLoadError,
  refresh: refreshSettings,
} = await useFetch<AppSettings>('/api/admin/settings')
const { data: staffUsers } = await useFetch<Array<{ id: number, displayName: string }>>('/api/users')

const allowEarlyTrialOutcomes = ref(true)
const trackedAcquisitionOwnerUserId = ref('')

watch(appSettings, (value) => {
  if (typeof value?.allowEarlyTrialOutcomes === 'boolean') {
    allowEarlyTrialOutcomes.value = value.allowEarlyTrialOutcomes
  }
  if (value) {
    trackedAcquisitionOwnerUserId.value = value.trackedAcquisitionOwnerUserId != null
      ? String(value.trackedAcquisitionOwnerUserId)
      : ''
  }
}, { immediate: true })

const areas = listSettingsSections()

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${seconds}s`
}

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function saveTrialOutcomeSetting() {
  settingError.value = ''
  settingNotice.value = ''
  pendingSetting.value = true
  try {
    const saved = await $fetch<AppSettings>('/api/admin/settings', {
      method: 'PATCH',
      body: { allowEarlyTrialOutcomes: allowEarlyTrialOutcomes.value },
    })
    allowEarlyTrialOutcomes.value = saved.allowEarlyTrialOutcomes
    settingNotice.value = 'Saved Trial outcome setting.'
    await refreshSettings()
  } catch (caught) {
    settingError.value = apiError(caught, 'Could not save the Trial outcome setting.')
    await refreshSettings()
  } finally {
    pendingSetting.value = false
  }
}

async function saveTrackedAcquisitionOwner() {
  settingError.value = ''
  settingNotice.value = ''
  pendingCompensationSetting.value = true
  try {
    const saved = await $fetch<AppSettings>('/api/admin/settings', {
      method: 'PATCH',
      body: {
        trackedAcquisitionOwnerUserId: trackedAcquisitionOwnerUserId.value
          ? Number(trackedAcquisitionOwnerUserId.value)
          : null,
      },
    })
    trackedAcquisitionOwnerUserId.value = saved.trackedAcquisitionOwnerUserId != null
      ? String(saved.trackedAcquisitionOwnerUserId)
      : ''
    settingNotice.value = 'Saved tracked-acquisition credit owner.'
    await refreshSettings()
  } catch (caught) {
    settingError.value = apiError(caught, 'Could not save the tracked-acquisition credit owner.')
    await refreshSettings()
  } finally {
    pendingCompensationSetting.value = false
  }
}

async function restart() {
  errorMessage.value = ''
  notice.value = ''
  pendingRestart.value = true
  try {
    await $fetch('/api/admin/system/restart', { method: 'POST', body: {} })
    notice.value = 'The process is exiting so a supervisor can start it again. This page will stop responding.'
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Restart was not started.')
    await refresh()
  } finally {
    pendingRestart.value = false
  }
}

async function shutdown() {
  errorMessage.value = ''
  notice.value = ''
  pendingShutdown.value = true
  try {
    await $fetch('/api/admin/system/shutdown', { method: 'POST', body: {} })
    notice.value = 'The application is shutting down. It will stay unavailable until it is started from the host.'
  } catch (caught) {
    const message = apiError(caught, 'Shutdown was not started.')
    if (/Failed to fetch|Network Error|fetch/i.test(message)) {
      notice.value = 'The application is shutting down. It will stay unavailable until it is started from the host.'
      return
    }
    errorMessage.value = message
  } finally {
    pendingShutdown.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Settings"
      description="Application configuration and server controls. Additional settings can be added here later."
    />

    <AppAlert v-if="error">
      Could not load server status.
    </AppAlert>
    <AppAlert v-if="settingsLoadError">
      Could not load application settings.
    </AppAlert>
    <AppAlert v-if="settingError">
      {{ settingError }}
    </AppAlert>
    <AppAlert
      v-if="settingNotice"
      tone="success"
    >
      {{ settingNotice }}
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>

    <div class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="area in areas"
        :key="area.to"
        :to="area.to"
        class="panel p-5 hover:border-navy-600/40"
      >
        <p class="font-medium text-navy-900">
          {{ area.title }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ area.description }}
        </p>
      </NuxtLink>
    </div>

    <AppPanel
      :title="ALLOW_EARLY_TRIAL_OUTCOMES_LABEL"
      :description="ALLOW_EARLY_TRIAL_OUTCOMES_DESCRIPTION"
    >
      <label class="touch-row">
        <input
          v-model="allowEarlyTrialOutcomes"
          type="checkbox"
          class="mt-0.5"
        >
        <span>Authorized staff may mark Attended or No-show before the Trial scheduled start time.</span>
      </label>
      <div class="mt-4">
        <AppButton
          :disabled="pendingSetting"
          :loading="pendingSetting"
          @click="saveTrialOutcomeSetting"
        >
          Save
        </AppButton>
      </div>
    </AppPanel>

    <AppPanel
      :title="COMPENSATION_TRACKED_OWNER_LABEL"
      :description="COMPENSATION_TRACKED_OWNER_DESCRIPTION"
    >
      <AppField label="Credited user">
        <select
          v-model="trackedAcquisitionOwnerUserId"
          class="control"
        >
          <option value="">
            Unassigned
          </option>
          <option
            v-for="person in staffUsers"
            :key="person.id"
            :value="String(person.id)"
          >
            {{ person.displayName }}
          </option>
        </select>
      </AppField>
      <div class="mt-4">
        <AppButton
          :disabled="pendingCompensationSetting"
          :loading="pendingCompensationSetting"
          @click="saveTrackedAcquisitionOwner"
        >
          Save
        </AppButton>
      </div>
    </AppPanel>

    <AppPanel
      title="Application / Server"
      description="Safe runtime information only. Secrets and environment values are not shown."
    >
      <dl class="panel-list grid gap-4 sm:grid-cols-2">
        <div class="min-w-0">
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">
            Application
          </dt>
          <dd class="mt-1 break-words text-sm text-navy-900">
            {{ status?.app || '—' }}
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">
            Application environment
          </dt>
          <dd class="mt-1 text-sm text-navy-900">
            {{ status?.appEnv || '—' }}
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">
            Runtime mode
          </dt>
          <dd class="mt-1 text-sm text-navy-900">
            {{ status?.nodeEnv || '—' }}
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">
            Display timezone
          </dt>
          <dd class="mt-1 text-sm text-navy-900">
            {{ status?.timezone || '—' }}
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">
            Process uptime
          </dt>
          <dd class="mt-1 text-sm text-navy-900">
            {{ status ? formatUptime(status.uptimeSeconds) : '—' }}
          </dd>
        </div>
      </dl>
    </AppPanel>

    <AppPanel
      title="Restart application"
      description="Restarting will temporarily make the application unavailable. This only works when a supervisor is configured to start the process again."
    >
      <p class="text-sm text-muted">
        <template v-if="status?.restartEnabled">
          A supervisor hook is enabled. The process will exit so Docker (or another supervisor) can start it again. This does not talk to the Docker socket.
        </template>
        <template v-else>
          Restart is not available in this process. <code class="text-navy-900">pnpm dev</code> cannot restart itself. Set
          <code class="text-navy-900">APP_RESTART_ENABLED=true</code> only when Docker, systemd, or another wrapper will bring the app back.
        </template>
      </p>
      <div class="mt-4">
        <AppButton
          :disabled="!status?.restartEnabled || pendingRestart"
          :loading="pendingRestart"
          @click="confirmRestart = true"
        >
          Restart
        </AppButton>
      </div>
    </AppPanel>

    <AppPanel
      title="Shutdown application"
      description="This exits the Node process. Docker Compose with restart: unless-stopped will start the container again. To stop an environment, use the host operator command (pnpm env:<env>:down)."
    >
      <p class="text-sm text-muted">
        Shutdown does not receive Docker socket access and cannot stop the Compose project. Use the documented down command when you intend the environment to stay offline.
      </p>
      <div class="mt-4">
        <AppButton
          variant="danger"
          :disabled="pendingShutdown"
          :loading="pendingShutdown"
          @click="confirmShutdown = true"
        >
          Shut down
        </AppButton>
      </div>
    </AppPanel>

    <AppConfirm
      :open="confirmRestart"
      title="Restart the application?"
      description="Restarting will temporarily make the application unavailable. Continue?"
      confirm-label="Restart"
      @update:open="confirmRestart = $event"
      @confirm="restart"
    />
    <AppConfirm
      :open="confirmShutdown"
      title="Shut down the application?"
      description="Shutting down will make the application unavailable until it is started again from the host or deployment platform. Continue?"
      confirm-label="Shut down"
      danger
      @update:open="confirmShutdown = $event"
      @confirm="shutdown"
    />
  </section>
</template>
