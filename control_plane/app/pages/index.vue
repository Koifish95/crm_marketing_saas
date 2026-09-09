<script setup lang="ts">
useHead({ title: 'Environments' })

const { data, error, pending, refresh } = await useFetch('/api/status')
const refreshing = ref(false)

async function refreshStatus() {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
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
    </article>
  </main>
</template>
