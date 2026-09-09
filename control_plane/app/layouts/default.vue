<script setup lang="ts">
const route = useRoute()

const links = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/customers', label: 'Customers' },
  { to: '/environments', label: 'Environments' },
  { to: '/nodes', label: 'Hosting Nodes' },
  { to: '/settings', label: 'Settings' },
]
</script>

<template>
  <div class="shell">
    <aside class="nav">
      <p class="eyebrow">
        Operator
      </p>
      <p class="nav-brand">
        Control plane
      </p>
      <nav aria-label="Primary">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :class="{ active: link.exact ? route.path === '/' : route.path.startsWith(link.to) }"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </aside>
    <div class="shell-main">
      <slot />
    </div>
  </div>
</template>
