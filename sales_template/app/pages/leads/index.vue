<script setup lang="ts">
import { LEAD_STAGES, leadStageLabel } from '#shared/utils/pipeline'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Leads',
})

type Lead = {
  id: number
  displayName: string
  email: string | null
  phone: string | null
  stage: string
}

const search = ref('')
const mine = ref(false)
const displayName = ref('')
const email = ref('')
const phone = ref('')
const reachabilityNote = ref('')
const errorMessage = ref('')
const saving = ref(false)

const query = computed(() => ({
  search: search.value || undefined,
  mine: mine.value ? 'true' : undefined,
}))
const { data: leads, error, pending, refresh } = await useFetch<Lead[]>('/api/leads', { query })

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await $fetch<Lead>('/api/leads', {
      method: 'POST',
      body: {
        displayName: displayName.value,
        email: email.value || undefined,
        phone: phone.value || undefined,
        reachabilityNote: reachabilityNote.value || undefined,
      },
    })
    displayName.value = ''
    email.value = ''
    phone.value = ''
    reachabilityNote.value = ''
    await refresh()
    await navigateTo(`/leads/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that lead.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Leads"
      description="Pre-opportunity commercial interest. Company is optional."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load leads.' }}
    </AppAlert>
    <AppPanel title="New lead">
      <form
        class="grid gap-3 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AppField
          label="Display name"
          required
        >
          <input
            v-model="displayName"
            class="control"
            required
          >
        </AppField>
        <AppField label="Email">
          <input
            v-model="email"
            class="control"
            type="email"
          >
        </AppField>
        <AppField label="Phone">
          <input
            v-model="phone"
            class="control"
          >
        </AppField>
        <AppField
          label="Reachability note"
          hint="Required if email and phone are empty"
        >
          <input
            v-model="reachabilityNote"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create lead
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <div class="flex flex-wrap items-end gap-3">
      <AppField label="Search">
        <input
          v-model="search"
          class="control"
        >
      </AppField>
      <label class="touch-row">
        <input
          v-model="mine"
          type="checkbox"
        >
        Mine
      </label>
    </div>
    <AppEmpty
      v-if="!pending && !leads?.length"
      title="No leads yet"
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="lead in leads"
        :key="lead.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/leads/${lead.id}`"
          class="record-item-title"
        >
          {{ lead.displayName }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ leadStageLabel(lead.stage) }}
          · {{ lead.email || lead.phone || 'Reachability on file' }}
        </p>
      </li>
    </ul>
    <p class="text-xs text-muted">
      Stages {{ LEAD_STAGES.map(leadStageLabel).join(' → ') }}. Convert is an explicit action, not a stage button.
    </p>
  </section>
</template>
