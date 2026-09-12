<script setup lang="ts">
import { leadStageLabel, type LeadStage } from '#shared/utils/pipeline'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Assignee = { id: number, displayName: string }
type Lead = {
  id: number
  displayName: string
  email: string | null
  phone: string | null
  reachabilityNote: string | null
  accountId: number | null
  stage: LeadStage
  ownerUserId: number | null
  convertedAccountId: number | null
  convertedContactId: number | null
  convertedOpportunityId: number | null
}
type Company = { id: number, name: string }

const { data: assignees } = await useFetch<Assignee[]>('/api/assignees')
const { data: companies } = await useFetch<Company[]>('/api/companies')
const { data: lead, error, pending, refresh } = await useFetch<Lead>(() => `/api/leads/${id.value}`)

useHead({
  title: computed(() => lead.value?.displayName || 'Lead'),
})

const displayName = ref('')
const email = ref('')
const phone = ref('')
const reachabilityNote = ref('')
const ownerUserId = ref('')
const saving = ref(false)
const converting = ref(false)
const notice = ref('')
const formError = ref('')

watch(lead, (value) => {
  if (!value) {
    return
  }
  displayName.value = value.displayName
  email.value = value.email || ''
  phone.value = value.phone || ''
  reachabilityNote.value = value.reachabilityNote || ''
  ownerUserId.value = value.ownerUserId ? String(value.ownerUserId) : ''
}, { immediate: true })

const converted = computed(() => lead.value?.stage === 'converted')

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/leads/${id.value}`, {
      method: 'PATCH',
      body: {
        displayName: displayName.value,
        email: email.value || null,
        phone: phone.value || null,
        reachabilityNote: reachabilityNote.value || null,
        ownerUserId: ownerUserId.value ? Number(ownerUserId.value) : undefined,
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

async function setStage(stage: Exclude<LeadStage, 'converted'>) {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/leads/${id.value}`, { method: 'PATCH', body: { stage } })
    await refresh()
    notice.value = `Moved to ${leadStageLabel(stage)}.`
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not change stage.'
  } finally {
    saving.value = false
  }
}

async function convert() {
  formError.value = ''
  converting.value = true
  try {
    const result = await $fetch<{ opportunity: { id: number } }>(`/api/leads/${id.value}/convert`, { method: 'POST' })
    await refresh()
    await navigateTo(`/opportunities/${result.opportunity.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not convert this lead.'
  } finally {
    converting.value = false
  }
}

function companyName(accountId: number | null) {
  if (!accountId) {
    return 'No company yet'
  }
  return companies.value?.find(row => row.id === accountId)?.name || `Company #${accountId}`
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !lead">
    <template #header>
      <p class="record-kind">
        Lead
      </p>
      <h1 class="record-identity-name">
        {{ lead?.displayName || 'Lead' }}
      </h1>
      <p class="record-meta">
        {{ lead ? leadStageLabel(lead.stage) : '' }}
        · {{ companyName(lead?.accountId ?? null) }}
      </p>
    </template>
    <template #actions>
      <AppButton
        v-if="lead && !converted"
        :loading="converting"
        @click="convert"
      >
        Convert Lead
      </AppButton>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this lead.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <div
      v-if="lead && converted"
      class="mb-4 flex flex-wrap gap-2 text-sm"
    >
      <NuxtLink
        v-if="lead.convertedAccountId"
        :to="`/companies/${lead.convertedAccountId}`"
        class="btn btn-subtle text-sm"
      >
        Company
      </NuxtLink>
      <NuxtLink
        v-if="lead.convertedContactId"
        :to="`/contacts/${lead.convertedContactId}`"
        class="btn btn-subtle text-sm"
      >
        Contact
      </NuxtLink>
      <NuxtLink
        v-if="lead.convertedOpportunityId"
        :to="`/opportunities/${lead.convertedOpportunityId}`"
        class="btn btn-subtle text-sm"
      >
        Opportunity
      </NuxtLink>
    </div>
    <form
      v-if="lead"
      class="form-measure space-y-4"
      @submit.prevent="save"
    >
      <AppField
        label="Display name"
        required
      >
        <input
          v-model="displayName"
          class="control"
          required
          :disabled="converted"
        >
      </AppField>
      <AppField label="Email">
        <input
          v-model="email"
          class="control"
          :disabled="converted"
        >
      </AppField>
      <AppField label="Phone">
        <input
          v-model="phone"
          class="control"
          :disabled="converted"
        >
      </AppField>
      <AppField label="Reachability note">
        <textarea
          v-model="reachabilityNote"
          class="control"
          rows="2"
          :disabled="converted"
        />
      </AppField>
      <AppField label="Owner">
        <select
          v-model="ownerUserId"
          class="control"
        >
          <option
            v-for="person in assignees"
            :key="person.id"
            :value="String(person.id)"
          >
            {{ person.displayName }}
          </option>
        </select>
      </AppField>
      <div class="flex flex-wrap gap-2">
        <AppButton
          type="submit"
          :loading="saving"
        >
          Save
        </AppButton>
        <AppButton
          v-for="stage in (['new', 'contacted', 'qualified'] as const)"
          :key="stage"
          type="button"
          variant="secondary"
          :disabled="converted || lead.stage === stage || saving"
          @click="setStage(stage)"
        >
          {{ leadStageLabel(stage) }}
        </AppButton>
      </div>
    </form>
    <template #tabs>
      <div
        v-if="lead"
        class="mt-8 space-y-6"
      >
        <SalesHistory
          record-kind="lead"
          :record-id="lead.id"
        />
      </div>
    </template>
  </AppRecordWorkspace>
</template>
