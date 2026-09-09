<script setup lang="ts">
useHead({ title: 'Environments' })

const { data, error, pending, refresh } = await useFetch('/api/status')
const refreshing = ref(false)
const relaunchingId = ref<string | null>(null)
const actionError = ref('')

async function refreshStatus() {
  refreshing.value = true
  actionError.value = ''
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

async function relaunch(id: string) {
  relaunchingId.value = id
  actionError.value = ''
  try {
    await $fetch(`/api/environments/${id}/relaunch`, { method: 'POST' })
    await refresh()
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Relaunch failed.'
  } finally {
    relaunchingId.value = null
  }
}
</script>

<template>
  <main class="page">
    <p class="eyebrow">
      Operator
    </p>
    <div class="row">
      <h1>Environments</h1>
      <button
        type="button"
        class="secondary"
        :disabled="pending || refreshing"
        @click="refreshStatus"
      >
        Refresh
      </button>
    </div>
    <p class="muted">
      On-demand health. Last checked {{ data?.checkedAt || '—' }}.
    </p>
    <p
      v-if="actionError"
      class="muted"
    >
      {{ actionError }}
    </p>
    <p
      v-if="pending && !data"
      class="muted"
    >
      Loading…
    </p>
    <p
      v-else-if="error"
      class="muted"
    >
      Could not load the registry.
    </p>
    <article
      v-for="env in data?.environments || []"
      :key="env.id"
      class="card"
    >
      <p class="headline">
        {{ env.headline }}
      </p>
      <p>
        <span :class="['status', `status-${env.status}`]">{{ env.status }}</span>
      </p>
      <p class="muted">
        {{ env.node.name }} · runtime {{ env.runtime }} · {{ env.expectedImage }}
      </p>
      <button
        type="button"
        :disabled="Boolean(relaunchingId)"
        @click="relaunch(env.id)"
      >
        {{ relaunchingId === env.id ? 'Relaunching…' : 'Relaunch' }}
      </button>
    </article>
  </main>
</template>
