<script setup lang="ts">
import { companyLine, productName } from '~~/shared/site'

usePageMeta(
  'About',
  'Nuxxion is software for practical acquisition work. Nuxxion Martial Arts is developed and operated by Strategic Insights Consulting.',
)
</script>

<template>
  <article>
    <SiteContainer class="max-w-3xl py-16 lg:py-24">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
        About
      </p>
      <h1 class="mt-4 font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
        Software for the work after someone asks.
      </h1>
      <div class="mt-8 space-y-5 text-lg leading-8 text-navy-800">
        <p>Nuxxion is a software platform. The first product is {{ productName }}, an acquisition CRM for martial arts academies.</p>
        <p>The work it covers is specific: inquiries, intro trials, confirmation, attendance, follow-up, and the record of who joined or was lost.</p>
        <p>{{ companyLine }}</p>
        <p>The aim is practical operating software for a small business, not a second gym-management suite and not a public signup portal.</p>
      </div>
      <div class="mt-10">
        <PrimaryButton to="/demo">
          Request a Demo
        </PrimaryButton>
      </div>
    </SiteContainer>
  </article>
</template>
