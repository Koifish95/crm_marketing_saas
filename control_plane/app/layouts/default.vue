<script setup lang="ts">
import { OPERATOR_NAV, navLinkActive } from '~~/shared/utils/nav'

const route = useRoute()
</script>

<template>
  <div class="shell">
    <a
      class="skip-link"
      href="#main-content"
    >Skip to content</a>
    <aside class="nav">
      <p class="eyebrow">
        Operator
      </p>
      <p class="nav-brand">
        Control plane
      </p>
      <nav aria-label="Primary">
        <NuxtLink
          v-for="link in OPERATOR_NAV"
          :key="link.to"
          :to="link.to"
          :class="{ active: navLinkActive(route.path, link) }"
          :aria-current="navLinkActive(route.path, link) ? 'page' : undefined"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </aside>
    <div
      id="main-content"
      class="shell-main"
      tabindex="-1"
    >
      <slot />
    </div>
  </div>
</template>
