<script setup lang="ts">
import { formatUsdFromCents } from '#shared/utils/money'
import { proposalStatusLabel } from '#shared/utils/proposals'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Proposals',
})

type Row = {
  id: number
  opportunityId: number
  opportunityName: string
  companyName: string
  proposalNumber: string
  revision: number
  status: string
  sentAt: string | Date | null
  validThrough: string | null
  pastValidThrough: boolean
  amountCents: number
  mrrCents: number
  label: string
}

const { data: rows, error, pending } = await useFetch<Row[]>('/api/proposals')
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Proposals"
      description="Current Proposal revision for each Opportunity. Create and edit from the Opportunity workspace."
    />
    <AppAlert v-if="error">
      Could not load Proposals.
    </AppAlert>
    <p
      v-else-if="pending && !rows"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="row in rows"
        :key="row.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/opportunities/${row.opportunityId}`"
          class="record-item-title"
        >
          {{ row.label }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ row.opportunityName }}
          · {{ row.companyName }}
          · {{ proposalStatusLabel(row.status) }}
          <span v-if="row.sentAt">· Sent</span>
          · {{ formatUsdFromCents(row.amountCents) }}
          · {{ formatUsdFromCents(row.mrrCents) }} MRR
          <span
            v-if="row.pastValidThrough"
            class="text-red-800"
          >· Past valid-through</span>
        </p>
      </li>
    </ul>
    <p
      v-if="rows && !rows.length"
      class="text-sm text-muted"
    >
      No Proposals yet. Open an Opportunity to create a Draft.
    </p>
  </section>
</template>
