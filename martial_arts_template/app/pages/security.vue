<script setup lang="ts">
import { securityActionLabel, securityResultLabel, SECURITY_ACTION_LABELS, SECURITY_RESULT_LABELS } from '#shared/utils/labels'
import { toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Security activity',
})

interface SecurityEventRow {
  id: number
  createdAt: string | Date
  action: string
  result: string
  actorName: string | null
  actorEmail: string | null
  targetName: string | null
  targetEmail: string | null
  ip: string | null
  userAgent: string | null
}

const search = ref('')
const action = ref('')
const result = ref('')

const query = computed(() => ({
  search: search.value || undefined,
  action: action.value || undefined,
  result: result.value || undefined,
}))

const { data: events, pending, error, refresh } = await useFetch<SecurityEventRow[]>('/api/admin/security-events', { query })

const actionOptions = Object.keys(SECURITY_ACTION_LABELS)
const resultOptions = Object.keys(SECURITY_RESULT_LABELS)

const expandedId = ref<number | null>(null)

function when(value: string | Date) {
  return toBusinessDateTime(new Date(value).getTime())
}

function person(name: string | null, email: string | null) {
  if (name && email) {
    return `${name} (${email})`
  }
  return name || email || '—'
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Security activity"
      description="Sign-ins, account changes, and session actions. Passwords and hashes are never stored here."
    />

    <AppAlert v-if="error">
      Could not load security activity.
    </AppAlert>

    <form
      class="panel grid gap-3 p-5 sm:grid-cols-3"
      @submit.prevent="refresh()"
    >
      <input
        v-model="search"
        placeholder="Search name, email, or IP"
        class="control"
        aria-label="Search security activity"
      >
      <select
        v-model="action"
        class="control"
        aria-label="Action"
      >
        <option value="">
          All actions
        </option>
        <option
          v-for="item in actionOptions"
          :key="item"
          :value="item"
        >
          {{ securityActionLabel(item) }}
        </option>
      </select>
      <select
        v-model="result"
        class="control"
        aria-label="Result"
      >
        <option value="">
          All results
        </option>
        <option
          v-for="item in resultOptions"
          :key="item"
          :value="item"
        >
          {{ securityResultLabel(item) }}
        </option>
      </select>
    </form>

    <p
      v-if="pending && !events"
      class="text-sm text-muted"
    >
      Loading activity…
    </p>
    <AppEmpty
      v-else-if="!events?.length"
      title="No matching activity"
      description="Successful and failed sign-ins appear here as people use the app."
    />
    <ul
      v-else
      class="space-y-2 md:hidden"
    >
      <li
        v-for="event in events"
        :key="event.id"
        class="panel p-4"
      >
        <button
          type="button"
          class="flex min-h-11 w-full flex-col items-start gap-1 text-left"
          :aria-expanded="expandedId === event.id"
          @click="expandedId = expandedId === event.id ? null : event.id"
        >
          <p class="text-xs text-muted">
            {{ when(event.createdAt) }}
          </p>
          <p class="font-medium text-navy-900">
            {{ securityActionLabel(event.action) }}
            <span class="font-normal text-muted"> · {{ person(event.actorName, event.actorEmail) }}</span>
          </p>
          <AppBadge :tone="event.result === 'SUCCESS' ? 'success' : event.result === 'DENIED' ? 'warning' : 'danger'">
            {{ securityResultLabel(event.result) }}
          </AppBadge>
        </button>
        <div
          v-if="expandedId === event.id"
          class="mt-3 space-y-1 border-t border-line pt-3 text-sm"
        >
          <p>
            <span class="text-muted">Target:</span>
            {{ person(event.targetName, event.targetEmail) }}
          </p>
          <p>
            <span class="text-muted">IP:</span>
            {{ event.ip || '—' }}
          </p>
          <p class="break-words text-xs text-muted">
            {{ event.userAgent || '—' }}
          </p>
        </div>
      </li>
    </ul>
    <div
      v-if="events?.length"
      class="panel hidden overflow-x-auto md:block"
    >
      <table class="data-table">
        <thead class="border-b border-line bg-canvas text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">
              Time
            </th>
            <th class="px-4 py-3 font-medium">
              Action
            </th>
            <th class="px-4 py-3 font-medium">
              Actor
            </th>
            <th class="px-4 py-3 font-medium">
              Target
            </th>
            <th class="px-4 py-3 font-medium">
              Result
            </th>
            <th class="px-4 py-3 font-medium">
              IP
            </th>
            <th class="px-4 py-3 font-medium">
              Browser
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="event in events"
            :key="event.id"
            class="border-t border-line align-top"
          >
            <td class="whitespace-nowrap px-4 py-3 text-muted">
              {{ when(event.createdAt) }}
            </td>
            <td class="px-4 py-3 font-medium text-navy-900">
              {{ securityActionLabel(event.action) }}
            </td>
            <td class="px-4 py-3">
              {{ person(event.actorName, event.actorEmail) }}
            </td>
            <td class="px-4 py-3">
              {{ person(event.targetName, event.targetEmail) }}
            </td>
            <td class="px-4 py-3">
              <AppBadge :tone="event.result === 'SUCCESS' ? 'success' : event.result === 'DENIED' ? 'warning' : 'danger'">
                {{ securityResultLabel(event.result) }}
              </AppBadge>
            </td>
            <td class="px-4 py-3 text-muted">
              {{ event.ip || '—' }}
            </td>
            <td class="max-w-56 truncate px-4 py-3 text-xs text-muted">
              {{ event.userAgent || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
