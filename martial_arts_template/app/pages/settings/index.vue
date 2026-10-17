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

const settingError = ref('')
const settingNotice = ref('')
const pendingSetting = ref(false)
const pendingCompensationSetting = ref(false)

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
    settingNotice.value = 'Saved intro outcome setting.'
    await refreshSettings()
  } catch (caught) {
    settingError.value = apiError(caught, 'Could not save the intro outcome setting.')
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
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Settings"
      description="Configure academy schedules, catalog, access, and acquisition preferences."
    />

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
    <AppPanel>
      <ul class="link-list">
        <li
          v-for="area in areas"
          :key="area.to"
        >
          <NuxtLink
            :to="area.to"
            class="link-list-item"
          >
            <p class="link-list-title">
              {{ area.title }}
            </p>
            <p class="link-list-text">
              {{ area.description }}
            </p>
          </NuxtLink>
        </li>
      </ul>
    </AppPanel>

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
        <span>Authorized staff may mark Attended or No-show before the intro class starts.</span>
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
  </section>
</template>
