<script setup lang="ts">
usePageMeta(
  'How it works',
  'From inquiry to trial, confirmation, attendance, follow-up, and joined or lost. The martial arts acquisition workflow in Nuxxion.',
)
</script>

<template>
  <article>
    <SiteContainer class="py-16 lg:py-24">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
        How it works
      </p>
      <h1 class="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
        One path from inquiry to a decision.
      </h1>
      <p class="mt-5 max-w-2xl text-lg leading-8 text-muted">
        Staff always know the next action. The software does not enroll anyone by itself, and it does not message them for you.
      </p>
      <WorkflowSteps />
      <section class="mt-16 max-w-3xl">
        <h2 class="font-display text-2xl font-semibold text-navy-900">
          After joined
        </h2>
        <p class="mt-4 text-base leading-7 text-muted">
          Joined means a staff member recorded that this person became a member. It is not a payment. The academy copies or exports that person into the membership system it already uses.
        </p>
        <div class="mt-8">
          <PrimaryButton to="/demo">
            Request a Demo
          </PrimaryButton>
        </div>
      </section>
    </SiteContainer>
  </article>
</template>
