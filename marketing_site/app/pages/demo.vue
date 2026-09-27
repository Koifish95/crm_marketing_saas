<script setup lang="ts">
usePageMeta(
  'Request a demo',
  'Request a walkthrough of Nuxxion Martial Arts. We will contact you to arrange it.',
)
</script>

<template>
  <article>
    <SiteContainer class="grid gap-12 py-16 lg:grid-cols-[0.9fr_1fr] lg:py-24">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
          Request a Demo
        </p>
        <h1 class="mt-4 font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
          See the acquisition workflow.
        </h1>
        <p class="mt-5 text-lg leading-8 text-muted">
          Tell us who you are and how to reach the academy. We review the request and contact you to arrange a walkthrough. This form does not create an account.
        </p>
      </div>
      <DemoForm />
    </SiteContainer>
  </article>
</template>
