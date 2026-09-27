<script setup lang="ts">
import { workflow } from '~~/shared/site'
</script>

<template>
  <ol class="mt-10 grid gap-4 md:grid-cols-2">
    <li
      v-for="(step, index) in workflow"
      :key="step.title"
      class="border border-line bg-paper p-5"
    >
      <p class="font-display text-sm font-semibold text-brand-700">
        {{ index + 1 }}
      </p>
      <h3 class="mt-2 font-display text-xl font-semibold text-navy-900">
        {{ step.title }}
      </h3>
      <p class="mt-2 text-sm leading-6 text-muted">
        {{ step.text }}
      </p>
    </li>
  </ol>
</template>
