<script setup lang="ts">
import { heroImage, outcomes } from '~~/shared/site'

usePageMeta(
  'Product',
  'Nuxxion Martial Arts keeps inquiries, trials, follow-up, and joins in one operating workflow for martial arts academies.',
)
</script>

<template>
  <article>
    <SiteContainer class="py-16 lg:py-24">
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
        Product
      </p>
      <h1 class="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
        The acquisition CRM for martial arts academies.
      </h1>
      <p class="mt-5 max-w-2xl text-lg leading-8 text-muted">
        Nuxxion Martial Arts is the staff system for inquiries, intro trials, confirmation calls, attendance, and the decision to join or mark someone lost.
      </p>
      <div class="mt-8">
        <PrimaryButton to="/demo">
          Request a Demo
        </PrimaryButton>
      </div>
      <div class="mt-12">
        <BrowserFrame
          :src="heroImage.src"
          :alt="heroImage.alt"
        />
      </div>
    </SiteContainer>

    <section class="bg-canvas">
      <SiteContainer class="space-y-16 py-16 lg:py-24">
        <article
          v-for="item in outcomes"
          :key="item.title"
          class="grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <h2 class="font-display text-3xl font-semibold text-navy-900">
              {{ item.title }}
            </h2>
            <p class="mt-4 text-base leading-7 text-muted">
              {{ item.text }}
            </p>
          </div>
          <ProductScreenshot
            :src="item.image"
            :alt="item.alt"
          />
        </article>
      </SiteContainer>
    </section>

    <SiteContainer class="py-16 lg:py-24">
      <h2 class="font-display text-3xl font-semibold text-navy-900">
        What staff actually do in it
      </h2>
      <ul class="mt-8 grid gap-4 md:grid-cols-2">
        <li class="border border-line p-5 text-base leading-7 text-navy-800">
          See which households need a confirmation or a conversion call.
        </li>
        <li class="border border-line p-5 text-base leading-7 text-navy-800">
          Schedule an intro for one person without losing the rest of the family.
        </li>
        <li class="border border-line p-5 text-base leading-7 text-navy-800">
          Record attended, no-show, or cancelled, then keep the next call on the list.
        </li>
        <li class="border border-line p-5 text-base leading-7 text-navy-800">
          Mark joined or lost per person, and see which campaign or source produced the inquiry.
        </li>
      </ul>
      <p class="mt-8 max-w-2xl text-base leading-7 text-muted">
        It does not bill memberships, send texts, publish to social networks, or run the academy’s class schedule.
      </p>
    </SiteContainer>
  </article>
</template>
