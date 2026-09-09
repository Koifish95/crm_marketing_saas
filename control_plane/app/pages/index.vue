<script setup lang="ts">
useHead({ title: 'Environments' })

const { data, error, pending } = await useFetch('/api/environments')
</script>

<template>
  <main class="page">
    <p class="eyebrow">
      Operator
    </p>
    <h1>Environments</h1>
    <p class="muted">
      Registered inventory only. Runtime and health are later sprints.
    </p>
    <p
      v-if="pending"
      class="muted"
    >
      Loading…
    </p>
    <p
      v-else-if="error"
      class="muted"
    >
      Could not load the registry.
    </p>
    <article
      v-for="env in data?.environments || []"
      :key="env.id"
      class="card"
    >
      <p class="headline">
        {{ env.headline }}
      </p>
      <p class="muted">
        {{ env.node.name }} · {{ env.expectedImage }}
      </p>
      <p class="muted">
        Health {{ env.healthUrl }}
      </p>
    </article>
  </main>
</template>
