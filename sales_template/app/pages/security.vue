<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Security activity',
})

type SecurityEventRow = {
  id: number
  createdAt: string | Date
  action: string
  result: string
  actorName: string | null
  actorEmail: string | null
}

const { data: events, error, pending } = await useFetch<SecurityEventRow[]>('/api/admin/security-events')
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Security activity"
      description="Login, logout, user create, and password events."
    />
    <AppAlert v-if="error">
      Could not load security activity.
    </AppAlert>
    <p
      v-if="pending && !events"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <table
      v-else
      class="data-table"
    >
      <thead>
        <tr>
          <th>When</th>
          <th>Action</th>
          <th>Result</th>
          <th>Actor</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="event in events"
          :key="event.id"
        >
          <td>{{ new Date(event.createdAt).toLocaleString() }}</td>
          <td>{{ event.action }}</td>
          <td>{{ event.result }}</td>
          <td>{{ event.actorName || event.actorEmail || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
