<script setup lang="ts">
import {
  ACTIVE_OPPORTUNITY_STAGES,
  LOSS_REASONS,
  isTerminalOpportunityStage,
  lossReasonLabel,
  opportunityStageLabel,
  type OpportunityStage,
} from '#shared/utils/pipeline'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Company = { id: number, name: string }
type Contact = { id: number, accountId: number, firstName: string, lastName: string }
type Assignee = { id: number, displayName: string }
type Opportunity = {
  id: number
  accountId: number
  primaryContactId: number | null
  sourceLeadId: number | null
  name: string
  amountCents: number | null
  stage: OpportunityStage
  ownerUserId: number | null
  lossReason: string | null
  lossNotes: string | null
  notes: string | null
}
type Activity = { id: number, description: string, status: string }

const { data: companies } = await useFetch<Company[]>('/api/companies')
const { data: assignees } = await useFetch<Assignee[]>('/api/assignees')
const { data: opportunity, error, pending, refresh } = await useFetch<Opportunity>(() => `/api/opportunities/${id.value}`)
const { data: contacts } = await useFetch<Contact[]>('/api/contacts', {
  query: computed(() => ({ accountId: opportunity.value ? String(opportunity.value.accountId) : undefined })),
})
const { data: activities, refresh: refreshActivities } = await useFetch<Activity[]>('/api/activities', {
  query: computed(() => ({ opportunityId: String(id.value) })),
})

useHead({
  title: computed(() => opportunity.value?.name || 'Opportunity'),
})

const name = ref('')
const notes = ref('')
const amount = ref('')
const primaryContactId = ref('')
const ownerUserId = ref('')
const lossReason = ref('budget')
const lossNotes = ref('')
const activityDescription = ref('')
const saving = ref(false)
const notice = ref('')
const formError = ref('')

watch(opportunity, (value) => {
  if (!value) {
    return
  }
  name.value = value.name
  notes.value = value.notes || ''
  amount.value = value.amountCents != null ? String(value.amountCents / 100) : ''
  primaryContactId.value = value.primaryContactId ? String(value.primaryContactId) : ''
  ownerUserId.value = value.ownerUserId ? String(value.ownerUserId) : ''
  lossReason.value = value.lossReason || 'budget'
  lossNotes.value = value.lossNotes || ''
}, { immediate: true })

const terminal = computed(() => opportunity.value ? isTerminalOpportunityStage(opportunity.value.stage) : false)

async function save(nextStage?: 'proposal_quote' | 'decision') {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    const dollars = amount.value.trim()
    await $fetch(`/api/opportunities/${id.value}`, {
      method: 'PATCH',
      body: {
        name: name.value,
        notes: notes.value,
        amountCents: dollars ? Math.round(Number(dollars) * 100) : null,
        stage: nextStage,
        primaryContactId: primaryContactId.value ? Number(primaryContactId.value) : null,
        ownerUserId: ownerUserId.value ? Number(ownerUserId.value) : undefined,
      },
    })
    await refresh()
    notice.value = nextStage ? `Moved to ${opportunityStageLabel(nextStage)}.` : 'Saved.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save.'
  } finally {
    saving.value = false
  }
}

async function markWon() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}/won`, { method: 'POST' })
    await refresh()
    notice.value = 'Marked Won (signed agreement / SOW).'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not mark Won.'
  } finally {
    saving.value = false
  }
}

async function markLost() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}/lost`, {
      method: 'POST',
      body: { lossReason: lossReason.value, lossNotes: lossNotes.value || undefined },
    })
    await refresh()
    notice.value = 'Marked Lost.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not mark Lost.'
  } finally {
    saving.value = false
  }
}

async function reopen() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}/reopen`, { method: 'POST' })
    await refresh()
    notice.value = 'Reopened to Decision.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not reopen.'
  } finally {
    saving.value = false
  }
}

async function addActivity() {
  formError.value = ''
  try {
    await $fetch('/api/activities', {
      method: 'POST',
      body: { opportunityId: id.value, description: activityDescription.value, type: 'task' },
    })
    activityDescription.value = ''
    await refreshActivities()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not add activity.'
  }
}

function companyName() {
  return companies.value?.find(row => row.id === opportunity.value?.accountId)?.name
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !opportunity">
    <template #header>
      <p class="record-kind">
        Opportunity
      </p>
      <h1 class="record-identity-name">
        {{ opportunity?.name || 'Opportunity' }}
      </h1>
      <p class="record-meta">
        {{ opportunity ? opportunityStageLabel(opportunity.stage) : '' }}
        ·
        <NuxtLink
          v-if="opportunity"
          :to="`/companies/${opportunity.accountId}`"
        >
          {{ companyName() }}
        </NuxtLink>
      </p>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this opportunity.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <form
      v-if="opportunity"
      class="form-measure space-y-4"
      @submit.prevent="save()"
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
      <AppField label="Primary contact">
        <select
          v-model="primaryContactId"
          class="control"
        >
          <option value="">
            None
          </option>
          <option
            v-for="contact in contacts"
            :key="contact.id"
            :value="String(contact.id)"
          >
            {{ contact.firstName }} {{ contact.lastName }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Amount (USD)"
        hint="One-time estimated value. MRR waits for Slice B."
      >
        <input
          v-model="amount"
          class="control"
          inputmode="decimal"
        >
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
      <AppField label="Notes">
        <textarea
          v-model="notes"
          class="control"
          rows="3"
        />
      </AppField>
      <div class="flex flex-wrap gap-2">
        <AppButton
          type="submit"
          :loading="saving"
        >
          Save
        </AppButton>
        <AppButton
          v-for="code in ACTIVE_OPPORTUNITY_STAGES"
          :key="code"
          type="button"
          variant="secondary"
          :disabled="terminal || opportunity.stage === code || saving"
          @click="save(code)"
        >
          {{ opportunityStageLabel(code) }}
        </AppButton>
      </div>
    </form>
    <div
      v-if="opportunity && !terminal"
      class="form-measure mt-6 space-y-3"
    >
      <p class="text-sm text-muted">
        Won means a signed agreement / SOW. Staff-asserted. Not invoice, payment, or kickoff.
      </p>
      <AppButton
        :loading="saving"
        @click="markWon"
      >
        Mark Won
      </AppButton>
      <AppField label="Lost reason">
        <select
          v-model="lossReason"
          class="control"
        >
          <option
            v-for="reason in LOSS_REASONS"
            :key="reason"
            :value="reason"
          >
            {{ lossReasonLabel(reason) }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Lost notes"
        hint="Required when reason is Other"
      >
        <textarea
          v-model="lossNotes"
          class="control"
          rows="2"
        />
      </AppField>
      <AppButton
        variant="secondary"
        :loading="saving"
        @click="markLost"
      >
        Mark Lost
      </AppButton>
    </div>
    <div
      v-else-if="opportunity && terminal"
      class="form-measure mt-6 space-y-3"
    >
      <p class="text-sm">
        Terminal: {{ opportunityStageLabel(opportunity.stage) }}
        <span v-if="opportunity.lossReason">
          · {{ lossReasonLabel(opportunity.lossReason) }}
        </span>
      </p>
      <AppButton
        :loading="saving"
        @click="reopen"
      >
        Reopen
      </AppButton>
    </div>
    <template #tabs>
      <div
        v-if="opportunity"
        class="mt-8 space-y-6"
      >
        <p
          v-if="opportunity.sourceLeadId"
          class="text-sm"
        >
          <NuxtLink :to="`/leads/${opportunity.sourceLeadId}`">
            Source Lead
          </NuxtLink>
        </p>
        <AppPanel title="Activities">
          <form
            class="mb-3 flex gap-2"
            @submit.prevent="addActivity"
          >
            <input
              v-model="activityDescription"
              class="control flex-1"
              placeholder="Follow-up"
              required
            >
            <AppButton type="submit">
              Add
            </AppButton>
          </form>
          <ul class="space-y-2 text-sm">
            <li
              v-for="activity in activities"
              :key="activity.id"
            >
              {{ activity.description }}
              <span class="text-muted">
                · {{ activity.status }}
              </span>
            </li>
          </ul>
        </AppPanel>
        <SalesHistory
          record-kind="opportunity"
          :record-id="opportunity.id"
        />
      </div>
    </template>
  </AppRecordWorkspace>
</template>
