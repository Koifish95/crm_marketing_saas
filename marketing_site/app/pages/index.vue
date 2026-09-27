<script setup lang="ts">
import { faqs, heroImage, outcomes } from '~~/shared/site'

usePageMeta(
  'Nuxxion Martial Arts',
  'Turn more martial arts inquiries into members. Nuxxion Martial Arts is the acquisition CRM for trials, follow-up, and conversion.',
)

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'Nuxxion Martial Arts',
      'applicationCategory': 'BusinessApplication',
      'operatingSystem': 'Web',
      'description': 'Acquisition CRM for martial arts academies. Trials, follow-up, and conversion.',
    }),
  }],
})
</script>

<template>
  <div>
    <section class="border-b border-line">
      <SiteContainer class="grid items-center gap-12 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-24">
        <div class="reveal">
          <p class="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
            Nuxxion Martial Arts
          </p>
          <h1 class="mt-4 font-display text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
            Turn more martial arts inquiries into members.
          </h1>
          <p class="mt-5 max-w-xl text-lg leading-8 text-muted">
            Keep every inquiry, trial, confirmation, and follow-up in one operating workflow. Staff can see who still needs a call, who attended, and who joined.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton to="/demo">
              Request a Demo
            </PrimaryButton>
            <SecondaryButton to="#workflow">
              See How It Works
            </SecondaryButton>
          </div>
        </div>
        <div class="reveal">
          <BrowserFrame
            :src="heroImage.src"
            :alt="heroImage.alt"
          />
        </div>
      </SiteContainer>
    </section>

    <section class="bg-canvas">
      <SiteContainer class="py-16 lg:py-24">
        <SectionHeader
          eyebrow="The work after interest"
          title="Interest is easy to start. Follow-through is the job."
          text="A missed confirmation, a no-show with no callback, or a family that never gets a decision is a member you do not enroll. Nuxxion Martial Arts is the list of that work."
        />
      </SiteContainer>
    </section>

    <section id="workflow">
      <SiteContainer class="py-16 lg:py-24">
        <SectionHeader
          eyebrow="Acquisition workflow"
          title="From the first inquiry to joined or lost."
          text="The product follows the academy’s acquisition work. It does not replace billing or day-to-day member operations."
        />
        <WorkflowSteps />
      </SiteContainer>
    </section>

    <section class="bg-canvas">
      <SiteContainer class="space-y-16 py-16 lg:space-y-24 lg:py-24">
        <article
          v-for="(item, index) in outcomes"
          :key="item.title"
          class="grid items-center gap-8 lg:grid-cols-2"
        >
          <div :class="index % 2 === 1 ? 'lg:order-2' : ''">
            <SectionHeader
              :eyebrow="item.eyebrow"
              :title="item.title"
              :text="item.text"
            />
          </div>
          <ProductScreenshot
            :src="item.image"
            :alt="item.alt"
          />
        </article>
      </SiteContainer>
    </section>

    <section>
      <SiteContainer class="py-16 lg:py-24">
        <SectionHeader
          eyebrow="Position"
          title="Built for acquisition. Not a gym-management replacement."
          text="Nuxxion Martial Arts sits in front of the system you already use. Billing, waivers, rank, class schedules, and ongoing member operations stay there. When someone joins, staff record it here and continue membership in that system."
        />
      </SiteContainer>
    </section>

    <section class="bg-navy-900 text-white">
      <SiteContainer class="grid gap-8 py-16 md:grid-cols-3 lg:py-20">
        <div>
          <h2 class="font-display text-xl font-semibold">
            Separate environment
          </h2>
          <p class="mt-3 text-sm leading-6 text-brand-100">
            Each academy runs in its own environment, with its own database and files.
          </p>
        </div>
        <div>
          <h2 class="font-display text-xl font-semibold">
            Isolated records
          </h2>
          <p class="mt-3 text-sm leading-6 text-brand-100">
            One academy cannot open another academy’s households, trials, or files.
          </p>
        </div>
        <div>
          <h2 class="font-display text-xl font-semibold">
            Operated for you
          </h2>
          <p class="mt-3 text-sm leading-6 text-brand-100">
            We provision the environment, keep backups, and apply updates. Staff use the address we give that academy.
          </p>
        </div>
      </SiteContainer>
    </section>

    <section>
      <SiteContainer class="py-16 lg:py-24">
        <SectionHeader
          eyebrow="Questions"
          title="What this product does, and what it leaves alone."
        />
        <FaqList />
        <p class="sr-only">
          {{ faqs.length }} questions
        </p>
      </SiteContainer>
    </section>

    <section class="border-t border-line bg-canvas">
      <SiteContainer class="flex flex-col items-start gap-6 py-16 lg:py-20">
        <h2 class="font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
          See the workflow on your academy.
        </h2>
        <p class="max-w-xl text-lg leading-8 text-muted">
          Request a demo. We will review the academy and contact you to arrange a walkthrough.
        </p>
        <PrimaryButton to="/demo">
          Request a Demo
        </PrimaryButton>
      </SiteContainer>
    </section>
  </div>
</template>
