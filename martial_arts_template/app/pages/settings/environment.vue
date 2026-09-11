<script setup lang="ts">
import { APP_ENV_LABELS, type AppEnv } from '@crm/core/shared/utils/app-env'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Environment',
})

interface SystemStatus {
  appEnv: string
}

const errorMessage = ref('')
const notice = ref('')
const pendingDownload = ref(false)
const pendingRestore = ref(false)
const confirmRestore = ref(false)
const confirmEnv = ref('')
const restoreFile = ref<File | null>(null)

const { data: status } = await useFetch<SystemStatus>('/api/admin/system/status')

const appEnv = computed(() => (status.value?.appEnv || 'dev') as AppEnv)
const appEnvLabel = computed(() => APP_ENV_LABELS[appEnv.value] || appEnv.value)
const confirmMatches = computed(() => confirmEnv.value.trim() === appEnv.value)

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string, statusMessage?: string }
  return err.data?.message || err.message || err.statusMessage || fallback
}

function onRestoreFile(event: Event) {
  const input = event.target as HTMLInputElement
  restoreFile.value = input.files?.[0] ?? null
}

async function downloadBackup() {
  errorMessage.value = ''
  notice.value = ''
  pendingDownload.value = true
  try {
    const response = await fetch('/api/admin/environment/backup', { credentials: 'include' })
    if (!response.ok) {
      let message = 'Could not download a backup.'
      try {
        const body = await response.json() as { message?: string, statusMessage?: string }
        message = body.message || body.statusMessage || message
      } catch {
        // Non-JSON error body.
      }
      throw new Error(message)
    }
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') || ''
    const match = disposition.match(/filename="([^"]+)"/)
    const filename = match?.[1] || `renzo-${appEnv.value}-backup.zip`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notice.value = `Saved ${filename}. Restore that file on the destination environment.`
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not download a backup.')
  } finally {
    pendingDownload.value = false
  }
}

async function restoreBackup() {
  errorMessage.value = ''
  notice.value = ''
  if (!restoreFile.value) {
    errorMessage.value = 'Choose a backup zip first.'
    return
  }
  if (!confirmMatches.value) {
    errorMessage.value = `Type ${appEnv.value} to confirm restoring into this environment.`
    return
  }
  pendingRestore.value = true
  try {
    const body = new FormData()
    body.append('file', restoreFile.value)
    body.append('confirmEnv', confirmEnv.value.trim())
    await $fetch('/api/admin/environment/restore', { method: 'POST', body })
    notice.value = 'Restore finished. This process is exiting so the new database can be opened. Sign in with users from the backup.'
  } catch (caught) {
    const message = apiError(caught, 'Could not restore the backup.')
    if (/Failed to fetch|Network Error|fetch/i.test(message)) {
      notice.value = 'Restore finished. This process is exiting so the new database can be opened. Sign in with users from the backup.'
      return
    }
    errorMessage.value = message
  } finally {
    pendingRestore.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Settings"
      title="Environment"
      :description="`Actions apply only to this running process (${appEnvLabel}). Copy between environments by downloading a backup here, switching URLs, and restoring on the destination.`"
    />

    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>

    <AppPanel
      title="Copy between environments"
      description="Containers cannot see each other’s volumes. Download a zip on the source, then restore that file on the destination. Session cookies do not carry across ports. After restore, sign in with users from the backup."
    >
      <ol class="list-decimal space-y-2 pl-5 text-sm text-navy-900">
        <li>On the source environment, download a backup. The browser asks where to save it.</li>
        <li>Open the destination with the PRODUCTION / STAGE / DEV links in the staff chrome (<code class="text-navy-900">:5000</code> / <code class="text-navy-900">:5010</code> / <code class="text-navy-900">:5020</code>), or stay on this URL to restore in place.</li>
        <li>On the destination, restore the zip. That overwrites this environment’s SQLite and marketing uploads.</li>
      </ol>
      <p class="mt-4 text-sm text-muted">
        Host shortcuts still work: <code class="text-navy-900">pnpm env:pull -- --confirm-pull-from-prod</code> copies PRODUCTION onto STAGE and DEV without downloading. Daily PRODUCTION zips land on this machine under <code class="text-navy-900">data/backups/production/</code> (<code class="text-navy-900">pnpm backup:status</code>). Those files do not survive disk or laptop loss; off-host copies are later work.
      </p>
    </AppPanel>

    <AppPanel
      title="Download backup"
      description="Saves this environment’s SQLite database and marketing uploads as a zip. Use the browser Save As dialog to put it wherever you want."
    >
      <AppButton
        :disabled="pendingDownload"
        :loading="pendingDownload"
        @click="downloadBackup"
      >
        Download backup
      </AppButton>
    </AppPanel>

    <AppPanel
      title="Restore backup"
      description="Replaces this environment’s data with the zip. Docker will start the process again. Local pnpm dev stays down until you start it."
    >
      <div class="space-y-4">
        <AppField
          label="Backup zip"
          required
        >
          <input
            type="file"
            accept=".zip,application/zip"
            class="control"
            @change="onRestoreFile"
          >
        </AppField>
        <AppField
          :label="`Type ${appEnv} to confirm`"
          required
        >
          <input
            v-model="confirmEnv"
            type="text"
            class="control"
            :placeholder="appEnv"
            autocomplete="off"
          >
        </AppField>
        <AppButton
          variant="danger"
          :disabled="pendingRestore || !restoreFile || !confirmMatches"
          :loading="pendingRestore"
          @click="confirmRestore = true"
        >
          Restore into {{ appEnvLabel }}
        </AppButton>
      </div>
    </AppPanel>

    <AppConfirm
      :open="confirmRestore"
      :title="`Replace ${appEnvLabel} data?`"
      description="This overwrites the SQLite database and marketing uploads in this environment. Sign-in after restore uses users from the backup."
      confirm-label="Restore"
      danger
      @update:open="confirmRestore = $event"
      @confirm="restoreBackup"
    />
  </section>
</template>
