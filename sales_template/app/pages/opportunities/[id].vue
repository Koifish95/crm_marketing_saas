<script setup lang="ts">
import { OPPORTUNITY_STAGES, opportunityStageLabel, type OpportunityStage } from '#shared/utils/pipeline'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Company = { id: number, name: string }
type Contact = { id: number, accountId: number, firstName: string, lastName: string }
type Opportunity = {
  id: number
  accountId: number
  primaryContactId: number | null
  name: string
  amountCents: number | null
  stage: OpportunityStage
  notes: string | null
}

const { data: companies } = await useFetch<Company[]>('/api/companies')
const { data: opportunity, error, pending, refresh } = await useFetch<Opportunity>(() => `/api/opportunities/${id.value}`)
const { data: contacts } = await useFetch<Contact[]>('/api/contacts', {
  query: computed(() => ({ accountId: opportunity.value ? String(opportunity.value.accountId) : undefined })),
})

useHead({
  title: computed(() => opportunity.value?.name || 'Opportunity'),
})

const name = ref('')
const notes = ref('')
const amount = ref('')
const stage = ref<OpportunityStage>('open')
const primaryContactId = ref('')
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
  stage.value = value.stage
  primaryContactId.value = value.primaryContactId ? String(value.primaryContactId) : ''
}, { immediate: true })

async function save(nextStage?: OpportunityStage) {
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
        stage: nextStage ?? stage.value,
        primaryContactId: primaryContactId.value ? Number(primaryContactId.value) : null,
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
        · {{ companies?.find(row => row.id === opportunity?.accountId)?.name }}
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
      <AppField label="Amount (USD)">
        <input
          v-model="amount"
          class="control"
          inputmode="decimal"
        >
      </AppField>
      <AppField label="Notes">
        <textarea
          v-model="notes"
          class="control"
          rows="4"
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
          v-for="code in OPPORTUNITY_STAGES"
          :key="code"
          type="button"
          variant="secondary"
          :disabled="opportunity.stage === code || saving"
          @click="save(code)"
        >
          {{ opportunityStageLabel(code) }}
        </AppButton>
      </div>
    </form>
  </AppRecordWorkspace>
</template>
