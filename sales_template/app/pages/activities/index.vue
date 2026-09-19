<script setup lang="ts">
import {
  ACTIVITY_TYPES,
  activityOutcomeLabel,
  activityTypeLabel,
} from '#shared/utils/pipeline'
import { ACTIVITY_QUEUE_QUERY_VALUES, activityQueueFromQuery } from '#shared/utils/queue'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Activities',
})

type Lead = { id: number, displayName: string }
type Opportunity = { id: number, name: string }
type Activity = {
  id: number
  description: string
  type: string
  status: string
  outcome: string | null
  dueAt: string | Date | null
  completedAt: string | Date | null
  opportunityId: number | null
  leadId: number | null
  ownerUserId: number | null
}

const route = useRoute()
const queues = ACTIVITY_QUEUE_QUERY_VALUES
type Queue = (typeof queues)[number]

const queue = ref<Queue>(activityQueueFromQuery(route.query.queue))
const mine = ref(false)
const description = ref('')
const type = ref('call')
const dueLocal = ref('')
const opportunityId = ref('')
const leadId = ref('')
const errorMessage = ref('')
const saving = ref(false)
const completingId = ref<number | null>(null)

watch(() => route.query.queue, (value) => {
  queue.value = activityQueueFromQuery(value)
})

const { data: opportunities } = await useFetch<Opportunity[]>('/api/opportunities')
const { data: leads } = await useFetch<Lead[]>('/api/leads')
const query = computed(() => ({
  queue: queue.value,
  mine: mine.value ? 'true' : undefined,
}))
const { data: activities, error, pending, refresh } = await useFetch<Activity[]>('/api/activities', { query })

function dueLabel(value: string | Date | null) {
  if (!value) {
    return 'No due date'
  }
  return new Date(value).toLocaleString()
}

async function setQueue(next: Queue) {
  queue.value = next
  await navigateTo({ path: '/activities', query: { queue: next } })
}

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    await $fetch('/api/activities', {
      method: 'POST',
      body: {
        description: description.value,
        type: type.value,
        dueAt: dueLocal.value ? new Date(dueLocal.value).getTime() : undefined,
        opportunityId: opportunityId.value ? Number(opportunityId.value) : undefined,
        leadId: leadId.value ? Number(leadId.value) : undefined,
      },
    })
    description.value = ''
    dueLocal.value = ''
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that activity.'
  } finally {
    saving.value = false
  }
}

async function complete(activity: Activity, payload: {
  outcome?: string
  notes: string
  next?: { type: string, description: string, dueAt: number }
}) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      body: {
        completed: true,
        outcome: payload.outcome,
        notes: payload.notes || undefined,
        nextActivity: payload.next,
      },
    })
    completingId.value = null
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not complete that activity.'
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Activities"
      description="Sales follow-up queue. Complete an activity, record an outcome, and schedule the next attempt without leaving this page."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load activities.' }}
    </AppAlert>
    <AppPanel title="New activity">
      <form
        class="grid gap-3 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AppField
          label="Description"
          required
        >
          <input
            v-model="description"
            class="control"
            required
          >
        </AppField>
        <AppField label="Type">
          <select
            v-model="type"
            class="control"
          >
            <option
              v-for="code in ACTIVITY_TYPES"
              :key="code"
              :value="code"
            >
              {{ activityTypeLabel(code) }}
            </option>
          </select>
        </AppField>
        <AppField
          label="Due"
          required
        >
          <input
            v-model="dueLocal"
            class="control"
            type="datetime-local"
            required
          >
        </AppField>
        <AppField label="Lead">
          <select
            v-model="leadId"
            class="control"
          >
            <option value="">
              None
            </option>
            <option
              v-for="lead in leads"
              :key="lead.id"
              :value="String(lead.id)"
            >
              {{ lead.displayName }}
            </option>
          </select>
        </AppField>
        <AppField label="Opportunity">
          <select
            v-model="opportunityId"
            class="control"
          >
            <option value="">
              None
            </option>
            <option
              v-for="opportunity in opportunities"
              :key="opportunity.id"
              :value="String(opportunity.id)"
            >
              {{ opportunity.name }}
            </option>
          </select>
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create activity
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <div class="flex flex-wrap items-center gap-2">
      <AppButton
        v-for="code in queues"
        :key="code"
        type="button"
        :variant="queue === code ? 'primary' : 'secondary'"
        @click="setQueue(code)"
      >
        {{ code.replace('_', ' ') }}
      </AppButton>
      <label class="touch-row ml-2">
        <input
          v-model="mine"
          type="checkbox"
        >
        Mine
      </label>
    </div>
    <AppEmpty
      v-if="!pending && !activities?.length"
      title="No activities in this queue"
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="activity in activities"
        :key="activity.id"
        class="record-item"
      >
        <p
          class="record-item-title"
          :class="{ 'line-through text-muted': activity.status === 'completed' || activity.status === 'cancelled' }"
        >
          {{ activity.description }}
        </p>
        <p class="record-item-meta">
          {{ activityTypeLabel(activity.type) }}
          · {{ activity.status }}
          · {{ dueLabel(activity.dueAt) }}
          <span v-if="activity.outcome">
            · {{ activityOutcomeLabel(activity.outcome) }}
          </span>
        </p>
        <div
          v-if="activity.status === 'open'"
          class="record-item-actions"
        >
          <AppButton
            variant="secondary"
            @click="completingId = completingId === activity.id ? null : activity.id"
          >
            {{ completingId === activity.id ? 'Close' : 'Complete' }}
          </AppButton>
        </div>
        <SalesActivityComplete
          v-if="completingId === activity.id"
          :activity-type="activity.type"
          @cancel="completingId = null"
          @complete="payload => complete(activity, payload)"
        />
      </li>
    </ul>
  </section>
</template>
