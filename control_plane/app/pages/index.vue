<script setup lang="ts">
useHead({ title: 'Dashboard' })

const { data, error, pending, refreshing, refreshStatus } = await useFleetStatus()
const relaunchingId = ref<string | null>(null)
const provisioning = ref(false)
const actionError = ref('')
const form = reactive({
  displayName: '',
  slug: '',
  timezone: 'America/Denver',
  adminEmail: '',
})

async function onRefresh() {
  actionError.value = ''
  await refreshStatus()
}

async function provisionCustomer() {
  provisioning.value = true
  actionError.value = ''
  try {
    const created = await $fetch<{ customerId: string }>('/api/customers', {
      method: 'POST',
      body: { ...form },
    })
    await $fetch(`/api/customers/${created.customerId}/provision`, { method: 'POST' })
    await refreshStatus()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Provision failed.')
  } finally {
    provisioning.value = false
  }
}

async function relaunch(id: string) {
  relaunchingId.value = id
  actionError.value = ''
  try {
    await $fetch(`/api/environments/${id}/relaunch`, { method: 'POST' })
    await refreshStatus()
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Relaunch failed.'
  } finally {
    relaunchingId.value = null
  }
}
</script>

<template>
  <main class="page">
    <AppPageHeader title="Dashboard">
      <template #actions>
        <button
          type="button"
          class="secondary"
          :disabled="pending || refreshing"
          @click="onRefresh"
        >
          Refresh
        </button>
      </template>
      On-demand health. Last checked {{ data?.checkedAt || '—' }}.
    </AppPageHeader>
    <form
      class="card"
      @submit.prevent="provisionCustomer"
    >
      <p class="headline">
        Provision
      </p>
      <p class="muted">
        Creates one PROD and one DEV. No extra environments.
      </p>
      <label>
        Display name
        <input
          v-model="form.displayName"
          required
          placeholder="Strategic Insights Consulting, LLC"
        >
      </label>
      <label>
        Slug
        <input
          v-model="form.slug"
          required
          placeholder="strategic-insights"
        >
      </label>
      <label>
        Timezone
        <input
          v-model="form.timezone"
          required
        >
      </label>
      <label>
        Admin email
        <input
          v-model="form.adminEmail"
          type="email"
          required
          placeholder="admin@strategic-insights.local"
        >
      </label>
      <button
        type="submit"
        :disabled="provisioning"
      >
        {{ provisioning ? 'Provisioning…' : 'Provision' }}
      </button>
    </form>
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
        <AppStatusBadge :status="env.status" />
      </p>
      <p class="access">
        <a
          :href="env.accessUrl"
          target="_blank"
          rel="noreferrer"
        >Open</a>
        <span class="muted">{{ env.accessUrl }}</span>
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
