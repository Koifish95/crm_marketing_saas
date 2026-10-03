<script setup lang="ts">
import { ticketCategories, ticketPriorities, ticketSources, ticketStatuses } from '~~/shared/schemas/ticketing'

useHead({ title: 'Tickets' })

const query = ref('')
const status = ref('')
const source = ref('')
const category = ref('')
const priority = ref('')
const sort = ref('updated')
const direction = ref('desc')
const page = ref(1)
const pageSize = 50
const requestQuery = computed(() => ({ query: query.value || undefined, status: status.value || undefined, source: source.value || undefined, category: category.value || undefined, priority: priority.value || undefined, sort: sort.value, direction: direction.value, page: page.value, pageSize }))
const { data, pending, error, refresh } = await useFetch('/api/tickets', { query: requestQuery, watch: [requestQuery] })
const tickets = computed(() => data.value?.tickets || [])
const total = computed(() => data.value?.total || 0)

watch([query, status, source, category, priority, sort, direction], () => {
  page.value = 1
})

function clearFilters() {
  query.value = ''
  status.value = ''
  source.value = ''
  category.value = ''
  priority.value = ''
  sort.value = 'updated'
  direction.value = 'desc'
}
</script>

<template>
  <main class="page">
    <AppPageHeader title="Tickets">
      <template #actions>
        <NuxtLink
          class="button"
          to="/tickets/new"
        >New ticket</NuxtLink>
        <AppRefreshButton
          :pending="pending"
          :refreshing="pending"
          @refresh="refresh"
        />
      </template>
      {{ total }} ticket{{ total === 1 ? '' : 's' }}. Automated findings remain findings until an operator promotes them.
    </AppPageHeader>
    <div class="filters">
      <AppSearchField v-model="query" />
      <label>Status<select v-model="status"><option value="">All</option><option
        v-for="item in ticketStatuses"
        :key="item"
        :value="item"
      >{{ item }}</option></select></label>
      <label>Source<select v-model="source"><option value="">All</option><option
        v-for="item in ticketSources"
        :key="item"
        :value="item"
      >{{ item }}</option></select></label>
      <label>Category<select v-model="category"><option value="">All</option><option
        v-for="item in ticketCategories"
        :key="item"
        :value="item"
      >{{ item }}</option></select></label>
      <label>Priority<select v-model="priority"><option value="">All</option><option
        v-for="item in ticketPriorities"
        :key="item"
        :value="item"
      >{{ item }}</option></select></label>
      <label>Sort<select v-model="sort"><option value="updated">Updated</option><option value="created">Created</option><option value="priority">Priority</option><option value="status">Status</option></select></label>
      <label>Direction<select v-model="direction"><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
      <button
        type="button"
        class="secondary"
        @click="clearFilters"
      >
        Clear
      </button>
    </div>
    <AppAsyncPanel
      :pending="pending"
      :error="error"
      :empty="tickets.length === 0"
      empty-message="No tickets match."
    >
      <AppDataTable
        label="Tickets"
        :columns="['Key', 'Title', 'Status', 'Priority', 'Source', 'Category', 'Scope', 'Assignee', 'Updated']"
      >
        <tr
          v-for="ticket in tickets"
          :key="ticket.id"
        >
          <td><NuxtLink :to="`/tickets/${ticket.id}`">{{ ticket.key }}</NuxtLink></td>
          <td class="headline">
            {{ ticket.title }}
          </td>
          <td><AppStatusBadge :status="ticket.status.toLowerCase()" /></td>
          <td>{{ ticket.priority }}</td>
          <td>{{ ticket.source }}</td>
          <td>{{ ticket.category }}</td>
          <td>{{ ticket.customerName || ticket.productId || ticket.environmentName || 'Platform' }}</td>
          <td>{{ ticket.assignee || 'Unassigned' }}</td>
          <td>{{ new Date(ticket.updatedAt).toLocaleString() }}</td>
        </tr>
      </AppDataTable>
      <div class="row pager">
        <button
          type="button"
          class="secondary"
          :disabled="page <= 1"
          @click="page--"
        >
          Previous
        </button>
        <span>Page {{ page }} of {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
        <button
          type="button"
          class="secondary"
          :disabled="page * pageSize >= total"
          @click="page++"
        >
          Next
        </button>
      </div>
    </AppAsyncPanel>
  </main>
</template>
