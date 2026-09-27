<script setup lang="ts">
import { companyName, productName } from '~~/shared/site'

usePageMeta(
  'Terms',
  'Draft terms for the Nuxxion marketing site. Requesting a demo is not a customer agreement.',
)
</script>

<template>
  <article>
    <SiteContainer class="max-w-3xl py-16 lg:py-24">
      <p class="text-sm font-semibold text-brand-700">
        Draft notice. Not a completed customer agreement.
      </p>
      <h1 class="mt-4 font-display text-4xl font-semibold tracking-tight text-navy-900">
        Terms
      </h1>
      <div class="mt-8 space-y-5 text-base leading-7 text-navy-800">
        <p>This website describes {{ productName }}. Reading it, or sending a demo request, does not create a contract and does not start a subscription.</p>
        <p>A hosted academy environment is provided only under a separate agreement with {{ companyName }}. That agreement is not published here.</p>
        <p>Product descriptions on this site match the current software. They are not a promise of billing, messaging, gym management, or self-service signup.</p>
        <p>{{ companyName }} has not published final terms of use for Nuxxion.com on this page.</p>
      </div>
    </SiteContainer>
  </article>
</template>
