<script setup lang="ts">
import { companyLine, companyName } from '~~/shared/site'

usePageMeta(
  'Privacy',
  'Draft privacy notice for the Nuxxion marketing site and demo request form.',
)
</script>

<template>
  <article>
    <SiteContainer class="max-w-3xl py-16 lg:py-24">
      <p class="text-sm font-semibold text-brand-700">
        Draft notice. Not a completed customer agreement.
      </p>
      <h1 class="mt-4 font-display text-4xl font-semibold tracking-tight text-navy-900">
        Privacy
      </h1>
      <div class="mt-8 space-y-5 text-base leading-7 text-navy-800">
        <p>This page describes the Nuxxion marketing site only. It is a draft. It is not the privacy terms of a hosted academy environment.</p>
        <p>The demo form asks for your name, academy, email, and phone. If you arrived from a campaign link, the site may also note the campaign parameters, the referring page, and the page you landed on. Phase 1 does not store that submission in a customer database.</p>
        <p>We use a demo request to contact you about a walkthrough. We do not sell that information.</p>
        <p>{{ companyLine }} Questions about this draft can be raised when we speak.</p>
        <p>{{ companyName }} has not published a final privacy policy for Nuxxion.com on this page.</p>
      </div>
    </SiteContainer>
  </article>
</template>
