<script setup lang="ts">
import { formatUsdFromCents } from '#shared/utils/money'
import { offerPricingTypeLabel } from '#shared/utils/catalog'
import { SIGNATURE_ACCEPTANCE_COPY, proposalStatusLabel } from '#shared/utils/proposals'

type Line = {
  description: string
  quantity: number
  pricingType: string
  unitPriceCents: number
  offerName: string | null
  oneTimeCents: number
  mrrCents: number
}

defineProps<{
  document: {
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
    lines: Line[]
    amountCents: number
    mrrCents: number
    pastValidThrough: boolean
    logoUrl?: string | null
  }
}>()
</script>

<template>
  <article class="proposal-doc mx-auto max-w-3xl space-y-6 bg-white p-8 text-navy-900 print:p-0">
    <header class="space-y-2 border-b border-navy-900/10 pb-4">
      <img
        v-if="document.logoUrl"
        :src="document.logoUrl"
        alt=""
        class="h-10 w-auto"
      >
      <p class="font-display text-xl font-semibold">
        {{ document.letterheadName || 'Proposal' }}
      </p>
      <p
        v-if="document.letterheadAddress"
        class="text-sm text-muted"
      >
        {{ document.letterheadAddress }}
      </p>
      <p class="text-sm text-muted">
        {{ [document.letterheadPhone, document.letterheadEmail, document.letterheadWebsite].filter(Boolean).join(' · ') }}
      </p>
    </header>
    <div>
      <p class="text-xs uppercase tracking-wide text-muted">
        {{ proposalStatusLabel(document.status) }}
        · {{ document.proposalNumber }} r{{ document.revision }}
      </p>
      <h1 class="font-display text-3xl font-semibold">
        {{ document.title }}
      </h1>
      <p
        v-if="document.issuedAtLabel"
        class="text-sm text-muted"
      >
        Issued {{ document.issuedAtLabel }}
      </p>
      <p
        v-if="document.validThrough"
        class="text-sm"
        :class="document.pastValidThrough ? 'text-red-800' : 'text-muted'"
      >
        Valid through {{ document.validThrough }}
        <span v-if="document.pastValidThrough">(past valid-through)</span>
      </p>
    </div>
    <section class="text-sm">
      <p v-if="document.companyName">
        Prepared for {{ document.companyName }}
      </p>
      <p v-if="document.recipientName">
        {{ document.recipientName }}<span v-if="document.recipientTitle">, {{ document.recipientTitle }}</span>
      </p>
      <p class="text-muted">
        {{ [document.recipientEmail, document.recipientPhone].filter(Boolean).join(' · ') }}
      </p>
    </section>
    <section v-if="document.intro">
      <h2 class="text-sm font-semibold">
        Scope
      </h2>
      <p class="whitespace-pre-wrap text-sm">
        {{ document.intro }}
      </p>
    </section>
    <section>
      <h2 class="text-sm font-semibold">
        Commercial offer
      </h2>
      <ul class="mt-2 space-y-2 text-sm">
        <li
          v-for="(line, index) in document.lines"
          :key="index"
        >
          {{ line.quantity }} × {{ line.description }}
          <span v-if="line.offerName"> ({{ line.offerName }})</span>
          · {{ offerPricingTypeLabel(line.pricingType) }}
          · {{ formatUsdFromCents(line.unitPriceCents) }} each
          · {{ line.pricingType === 'monthly' ? `${formatUsdFromCents(line.mrrCents)} MRR` : formatUsdFromCents(line.oneTimeCents) }}
        </li>
      </ul>
      <p
        v-if="!document.lines.length"
        class="text-sm text-muted"
      >
        No commercial lines.
      </p>
      <p class="mt-3 font-semibold">
        One-time total {{ formatUsdFromCents(document.amountCents) }}
      </p>
      <p class="font-semibold">
        Monthly recurring (MRR) {{ formatUsdFromCents(document.mrrCents) }}
      </p>
    </section>
    <section v-if="document.terms">
      <h2 class="text-sm font-semibold">
        Terms
      </h2>
      <p class="whitespace-pre-wrap text-sm">
        {{ document.terms }}
      </p>
    </section>
    <section v-if="document.notes">
      <h2 class="text-sm font-semibold">
        Notes
      </h2>
      <p class="whitespace-pre-wrap text-sm">
        {{ document.notes }}
      </p>
    </section>
    <p
      v-if="document.letterheadFooter"
      class="text-xs text-muted whitespace-pre-wrap"
    >
      {{ document.letterheadFooter }}
    </p>
    <section class="border-t border-navy-900/10 pt-4">
      <h2 class="text-sm font-semibold">
        Acceptance
      </h2>
      <p class="mt-2 text-sm">
        {{ SIGNATURE_ACCEPTANCE_COPY }}
      </p>
    </section>
  </article>
</template>
