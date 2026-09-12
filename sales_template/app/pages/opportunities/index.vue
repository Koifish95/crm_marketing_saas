<script setup lang="ts">
import { OPPORTUNITY_STAGES, opportunityStageLabel } from '#shared/utils/pipeline'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Opportunities',
})

type Company = { id: number, name: string }
type Opportunity = {
  id: number
  accountId: number
  primaryContactId: number | null
  name: string
  amountCents: number | null
  stage: string
}

const route = useRoute()
const search = ref('')
const accountId = ref(typeof route.query.accountId === 'string' ? route.query.accountId : '')
const name = ref('')
const amount = ref('')
const errorMessage = ref('')
const saving = ref(false)

const { data: companies } = await useFetch<Company[]>('/api/companies')
const query = computed(() => ({
  search: search.value || undefined,
  accountId: accountId.value || undefined,
}))
const { data: opportunities, error, pending, refresh } = await useFetch<Opportunity[]>('/api/opportunities', { query })

function companyName(id: number) {
  return companies.value?.find(row => row.id === id)?.name || `Company #${id}`
}

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const dollars = amount.value.trim()
    const created = await $fetch<Opportunity>('/api/opportunities', {
      method: 'POST',
      body: {
        accountId: Number(accountId.value),
        name: name.value,
        amountCents: dollars ? Math.round(Number(dollars) * 100) : undefined,
        stage: 'open',
      },
    })
    name.value = ''
    amount.value = ''
    await refresh()
    await navigateTo(`/opportunities/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that opportunity.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Opportunities"
      description="Provisional pipeline: Open → In progress → Won or Lost."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load opportunities.' }}
    </AppAlert>
    <AppPanel title="New opportunity">
      <form
        class="grid gap-3 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AppField
          label="Company"
          required
        >
          <select
            v-model="accountId"
            class="control"
            required
          >
            <option value="">
              Select a company
            </option>
            <option
              v-for="company in companies"
              :key="company.id"
              :value="String(company.id)"
            >
              {{ company.name }}
            </option>
          </select>
        </AppField>
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
        <AppField
          label="Amount (USD)"
          hint="Optional"
        >
          <input
            v-model="amount"
            class="control"
            inputmode="decimal"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create opportunity
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <AppField label="Search">
      <input
        v-model="search"
        class="control"
      >
    </AppField>
    <AppEmpty
      v-if="!pending && !opportunities?.length"
      title="No opportunities yet"
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="opportunity in opportunities"
        :key="opportunity.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/opportunities/${opportunity.id}`"
          class="record-item-title"
        >
          {{ opportunity.name }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ companyName(opportunity.accountId) }} · {{ opportunityStageLabel(opportunity.stage) }}
        </p>
      </li>
    </ul>
    <p class="text-xs text-muted">
      Stages {{ OPPORTUNITY_STAGES.join(', ') }} are provisional technical codes, not Strategic Insights business names.
    </p>
  </section>
</template>
