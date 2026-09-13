<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const proposalId = computed(() => Number(route.params.id))
const revisionId = computed(() => Number(route.params.revisionId))

type Document = {
  opportunityId: number
  proposalNumber: string
  revision: number
  status: string
  title: string
  intro: string | null
  terms: string | null
  notes: string | null
  validThrough: string | null
  issuedAtLabel: string | null
  companyName: string | null
  recipientName: string | null
  recipientTitle: string | null
  recipientEmail: string | null
  recipientPhone: string | null
  letterheadName: string | null
  letterheadAddress: string | null
  letterheadPhone: string | null
  letterheadEmail: string | null
  letterheadWebsite: string | null
  letterheadFooter: string | null
  hasLogo?: boolean
  lines: Array<{
    description: string
    quantity: number
    pricingType: string
    unitPriceCents: number
    offerName: string | null
    oneTimeCents: number
    mrrCents: number
  }>
  amountCents: number
  mrrCents: number
  pastValidThrough: boolean
}

const { data: document, error, pending } = await useFetch<Document>(
  () => `/api/proposals/${proposalId.value}/revisions/${revisionId.value}/preview`,
)

useHead({
  title: computed(() => document.value ? `${document.value.proposalNumber} r${document.value.revision}` : 'Proposal preview'),
})

const logoUrl = computed(() => {
  if (!document.value?.hasLogo) {
    return null
  }
  return `/api/proposals/${proposalId.value}/revisions/${revisionId.value}/logo`
})
</script>

<template>
  <section class="space-y-4">
    <p class="text-sm">
      <NuxtLink :to="document ? `/opportunities/${document.opportunityId}` : '/proposals'">
        Back to Opportunity
      </NuxtLink>
    </p>
    <AppAlert v-if="error">
      Could not load this Proposal preview.
    </AppAlert>
    <p
      v-else-if="pending && !document"
      class="text-sm text-muted"
    >
      Loading preview…
    </p>
    <ProposalDocumentView
      v-else-if="document"
      :document="{ ...document, logoUrl }"
    />
  </section>
</template>
