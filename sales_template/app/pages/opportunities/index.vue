<script setup lang="ts">
import { formatUsdFromCents } from '#shared/utils/money'
import {
  ACTIVE_OPPORTUNITY_STAGES,
  OPPORTUNITY_STAGES,
  activityTypeLabel,
  opportunityStageLabel,
} from '#shared/utils/pipeline'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Opportunities',
})

type NextActivity = {
  id: number
  description: string
  type: string
  dueAt: string | Date | null
  bucket: string
} | null

type Opportunity = {
  id: number
  accountId: number
  name: string
  amountCents: number | null
  mrrCents: number | null
  stage: string
  companyName?: string
  nextActivity?: NextActivity
}

const route = useRoute()
const search = ref('')
const accountId = ref(typeof route.query.accountId === 'string' ? route.query.accountId : '')
const stage = ref(typeof route.query.stage === 'string' ? route.query.stage : '')
const name = ref('')
const amount = ref('')
const errorMessage = ref('')
const saving = ref(false)

const { data: companies } = await useFetch<Array<{ id: number, name: string }>>('/api/companies')
const query = computed(() => ({
  search: search.value || undefined,
  accountId: accountId.value || undefined,
  stage: stage.value || undefined,
}))
const { data: opportunities, error, pending, refresh } = await useFetch<Opportunity[]>('/api/opportunities', { query })

function companyName(opportunity: Opportunity) {
  return opportunity.companyName || companies.value?.find(row => row.id === opportunity.accountId)?.name || `Company #${opportunity.accountId}`
}

function nextLabel(next: NextActivity) {
  if (!next) {
    return 'No next action'
  }
  const when = next.dueAt ? new Date(next.dueAt).toLocaleString() : 'No due date'
  const flag = next.bucket === 'overdue' ? 'Overdue · ' : next.bucket === 'due_today' ? 'Due today · ' : ''
  return `${flag}${activityTypeLabel(next.type)} · ${next.description} · ${when}`
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
        stage: 'working',
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
      description="Pipeline: Working → Proposal / Quote → Decision → Won or Lost. Create after the Company and Contacts exist."
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
          hint="Optional one-time line. Prefer commercial lines for MRR + setup."
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
    <div class="grid gap-3 sm:grid-cols-2">
      <AppField label="Search">
        <input
          v-model="search"
          class="control"
        >
      </AppField>
      <AppField label="Stage">
        <select
          v-model="stage"
          class="control"
        >
          <option value="">
            All stages
          </option>
          <option
            v-for="code in OPPORTUNITY_STAGES"
            :key="code"
            :value="code"
          >
            {{ opportunityStageLabel(code) }}
          </option>
        </select>
      </AppField>
    </div>
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
          {{ companyName(opportunity) }}
          · {{ opportunityStageLabel(opportunity.stage) }}
          · {{ formatUsdFromCents(opportunity.amountCents ?? 0) }} one-time
          · {{ formatUsdFromCents(opportunity.mrrCents ?? 0) }} MRR
        </p>
        <p class="record-item-meta">
          {{ nextLabel(opportunity.nextActivity ?? null) }}
        </p>
      </li>
    </ul>
    <p class="text-xs text-muted">
      Active stages: {{ ACTIVE_OPPORTUNITY_STAGES.map(opportunityStageLabel).join(', ') }}. Won/Lost are terminal until Reopen.
    </p>
  </section>
</template>
