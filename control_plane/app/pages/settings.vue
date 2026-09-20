<script setup lang="ts">
import { listenAddress } from '~~/shared/utils/listen'

useHead({ title: 'Settings' })

const backingUp = ref(false)
const notice = ref('')
const errorMessage = ref('')

async function backupRegistry() {
  backingUp.value = true
  errorMessage.value = ''
  notice.value = 'Creating a Control Plane registry snapshot…'
  try {
    const result = await $fetch<{ backup: { zipPath?: string, sqlitePath?: string } }>('/api/control-plane/backup', { method: 'POST' })
    notice.value = `Registry snapshot written. ${result.backup.zipPath || result.backup.sqlitePath || ''}`
  } catch (error) {
    notice.value = ''
    errorMessage.value = fetchMessage(error, 'Control Plane backup failed.')
  } finally {
    backingUp.value = false
  }
}
</script>

<template>
  <main class="page">
    <AppPageHeader title="Settings">
      Operator facts for this Control Plane process. Official operator login is not in this slice. Live DNS/TLS remain external.
    </AppPageHeader>
    <p
      v-if="errorMessage"
      class="action-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="notice"
      class="action-status"
    >
      {{ notice }}
    </p>
    <dl class="dl">
      <dt>Listen</dt>
      <dd>{{ listenAddress() }}</dd>
      <dt>Access</dt>
      <dd>Loopback only. Browse http://127.0.0.1:52100. Remote operators SSH-tunnel. Do not set CONTROL_PLANE_ALLOW_REMOTE for daily use.</dd>
      <dt>Docs</dt>
      <dd>See repository docs/11 - sic-operator-guide.md and docs/10 - safety.md.</dd>
    </dl>
    <div class="card">
      <p>
        Snapshot the Control Plane sqlite registry (not customer CRM databases). Customer environment backups stay on each environment Backup tab.
      </p>
      <button
        type="button"
        :disabled="backingUp"
        @click="backupRegistry"
      >
        {{ backingUp ? 'Backing up…' : 'Backup Control Plane registry' }}
      </button>
    </div>
  </main>
</template>
