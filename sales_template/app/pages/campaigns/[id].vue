<script setup lang="ts">
import { CAMPAIGN_STATUSES, campaignStatusLabel } from '#shared/utils/catalog'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Source = { id: number, name: string, code: string, active: boolean }
type Campaign = {
  id: number
  name: string
  description: string | null
  status: string
  startsAt: string | Date | null
  endsAt: string | Date | null
  budgetCents: number | null
}
type TrackingLink = {
  id: number
  campaignId: number
  sourceId: number
  label: string
  token: string
  active: boolean
  clickCount: number
}

const { data: sources, refresh: refreshSources } = await useFetch<Source[]>('/api/sources')
const { data: campaign, error, pending, refresh } = await useFetch<Campaign>(() => `/api/campaigns/${id.value}`)
const { data: links, refresh: refreshLinks } = await useFetch<TrackingLink[]>('/api/tracking-links', {
  query: computed(() => ({ campaignId: String(id.value) })),
})

useHead({
  title: computed(() => campaign.value?.name || 'Campaign'),
})

const name = ref('')
const description = ref('')
const budget = ref('')
const sourceName = ref('')
const linkLabel = ref('')
const linkSourceId = ref('')
const saving = ref(false)
const notice = ref('')
const formError = ref('')
const origin = computed(() => (import.meta.client ? window.location.origin : ''))

watch(campaign, (value) => {
  if (!value) {
    return
  }
  name.value = value.name
  description.value = value.description || ''
  budget.value = value.budgetCents != null ? String(value.budgetCents / 100) : ''
}, { immediate: true })

function sourceLabel(sourceId: number) {
  return sources.value?.find(row => row.id === sourceId)?.name || `Source #${sourceId}`
}

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    const dollars = budget.value.trim()
    await $fetch(`/api/campaigns/${id.value}`, {
      method: 'PATCH',
      body: {
        name: name.value,
        description: description.value,
        budgetCents: dollars ? Math.round(Number(dollars) * 100) : null,
      },
    })
    await refresh()
    notice.value = 'Saved.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save.'
  } finally {
    saving.value = false
  }
}

async function setStatus(status: string) {
  saving.value = true
  try {
    await $fetch(`/api/campaigns/${id.value}`, { method: 'PATCH', body: { status } })
    await refresh()
    notice.value = `Moved to ${campaignStatusLabel(status)}.`
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not change status.'
  } finally {
    saving.value = false
  }
}

async function addSource() {
  formError.value = ''
  try {
    await $fetch('/api/sources', { method: 'POST', body: { name: sourceName.value } })
    sourceName.value = ''
    await refreshSources()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not add source.'
  }
}

async function toggleSource(source: Source) {
  await $fetch(`/api/sources/${source.id}`, {
    method: 'PATCH',
    body: { active: !source.active },
  })
  await refreshSources()
}

async function addLink() {
  formError.value = ''
  try {
    await $fetch('/api/tracking-links', {
      method: 'POST',
      body: {
        campaignId: id.value,
        sourceId: Number(linkSourceId.value),
        label: linkLabel.value,
      },
    })
    linkLabel.value = ''
    await refreshLinks()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not create tracking link.'
  }
}

async function toggleLink(link: TrackingLink) {
  await $fetch(`/api/tracking-links/${link.id}`, {
    method: 'PATCH',
    body: { active: !link.active },
  })
  await refreshLinks()
}

async function copyLink(token: string) {
  if (!import.meta.client) {
    return
  }
  await navigator.clipboard.writeText(`${origin.value}/t/${token}`)
  notice.value = 'Copied tracking URL.'
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !campaign">
    <template #header>
      <p class="record-kind">
        Campaign
      </p>
      <h1 class="record-identity-name">
        {{ campaign?.name || 'Campaign' }}
      </h1>
      <p class="record-meta">
        {{ campaign ? campaignStatusLabel(campaign.status) : '' }}
      </p>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this campaign.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <form
      v-if="campaign"
      class="form-measure space-y-4"
      @submit.prevent="save"
    >
      <AppField
        label="Name"
        required
      >
        <input
          v-model="name"
          class="control"
          required
        >
      </AppField>
      <AppField label="Objective / description">
        <textarea
          v-model="description"
          class="control"
          rows="3"
        />
      </AppField>
      <AppField
        label="Planning budget (USD)"
        hint="Planning number only. Not ROI."
      >
        <input
          v-model="budget"
          class="control"
          inputmode="decimal"
        >
      </AppField>
      <div class="flex flex-wrap gap-2">
        <AppButton
          type="submit"
          :loading="saving"
        >
          Save
        </AppButton>
        <AppButton
          v-for="status in CAMPAIGN_STATUSES"
          :key="status"
          type="button"
          variant="secondary"
          :disabled="campaign.status === status || saving"
          @click="setStatus(status)"
        >
          {{ campaignStatusLabel(status) }}
        </AppButton>
      </div>
    </form>
    <template #tabs>
      <div
        v-if="campaign"
        class="mt-8 grid gap-6 lg:grid-cols-2"
      >
        <AppPanel title="Tracking links">
          <p class="mb-3 text-sm text-muted">
            Each link is a Campaign + Source combination. Multiple links per pair are allowed.
          </p>
          <form
            class="mb-4 space-y-3"
            @submit.prevent="addLink"
          >
            <AppField
              label="Label"
              required
            >
              <input
                v-model="linkLabel"
                class="control"
                required
                placeholder="September IT — Instagram bio"
              >
            </AppField>
            <AppField
              label="Source"
              required
            >
              <select
                v-model="linkSourceId"
                class="control"
                required
              >
                <option value="">
                  Choose a source
                </option>
                <option
                  v-for="source in sources?.filter(row => row.active)"
                  :key="source.id"
                  :value="String(source.id)"
                >
                  {{ source.name }}
                </option>
              </select>
            </AppField>
            <AppButton type="submit">
              Create tracking link
            </AppButton>
          </form>
          <ul class="space-y-3 text-sm">
            <li
              v-for="link in links"
              :key="link.id"
              class="rounded-md border border-line p-3"
            >
              <p class="font-medium">
                {{ link.label }}
              </p>
              <p class="text-muted">
                {{ sourceLabel(link.sourceId) }} · {{ link.clickCount }} clicks · {{ link.active ? 'Active' : 'Inactive' }}
              </p>
              <p class="mt-1 break-all text-xs">
                {{ origin }}/t/{{ link.token }}
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                <AppButton
                  variant="subtle"
                  @click="copyLink(link.token)"
                >
                  Copy URL
                </AppButton>
                <AppButton
                  variant="secondary"
                  @click="toggleLink(link)"
                >
                  {{ link.active ? 'Deactivate' : 'Activate' }}
                </AppButton>
              </div>
            </li>
          </ul>
        </AppPanel>
        <AppPanel title="Sources">
          <p class="mb-3 text-sm text-muted">
            Controlled list. Deactivating keeps historical attribution.
          </p>
          <form
            class="mb-3 flex gap-2"
            @submit.prevent="addSource"
          >
            <input
              v-model="sourceName"
              class="control flex-1"
              placeholder="New source name"
              required
            >
            <AppButton type="submit">
              Add
            </AppButton>
          </form>
          <ul class="space-y-2 text-sm">
            <li
              v-for="source in sources"
              :key="source.id"
            >
              {{ source.name }}
              <span class="text-muted">
                · {{ source.active ? 'Active' : 'Inactive' }}
              </span>
              <button
                type="button"
                class="ml-2 text-xs underline"
                @click="toggleSource(source)"
              >
                {{ source.active ? 'Deactivate' : 'Activate' }}
              </button>
            </li>
          </ul>
        </AppPanel>
      </div>
    </template>
  </AppRecordWorkspace>
</template>
