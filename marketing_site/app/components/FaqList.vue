<script setup lang="ts">
import { faqs } from '~~/shared/site'
</script>

<template>
  <div class="mt-10 divide-y divide-line border-y border-line">
    <details
      v-for="item in faqs"
      :key="item.question"
      class="group py-4"
    >
      <summary class="cursor-pointer list-none font-display text-lg font-semibold text-navy-900 [&::-webkit-details-marker]:hidden">
        <span class="flex items-start justify-between gap-4">
          {{ item.question }}
          <span
            aria-hidden="true"
            class="text-brand-700 group-open:rotate-45"
          >+</span>
        </span>
      </summary>
      <p class="mt-3 max-w-3xl text-base leading-7 text-muted">
        {{ item.answer }}
      </p>
    </details>
  </div>
</template>
