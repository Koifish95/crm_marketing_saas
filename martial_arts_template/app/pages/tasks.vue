<script setup lang="ts">
import { FOLLOW_UP_CALL_OUTCOME_LABELS } from '#shared/utils/follow-up'
import {
  dueStateLabel,
  dueStateTone,
  followUpPurposeLabel,
  personName,
  taskStatusLabel,
} from '#shared/utils/labels'
import { toBusinessDateTime } from '#shared/utils/time'
import type { FollowUpCallOutcome } from '#shared/schemas/enums'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'crm'],
})

useHead({
  title: 'Follow-up',
})

type TaskView = 'open' | 'due_today' | 'overdue' | 'upcoming' | 'completed' | 'cancelled'

interface StaffUser {
  id: number
  displayName: string
  role: string
}

interface QueueTask {
  id: number
  type: string
  purpose?: string
  status: string
  dueAt: string | Date
  outcome?: string | null
  notes?: string | null
  dueState?: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | null
  lead?: { id: number, firstName: string, lastName: string | null, phone: string | null } | null
  trial?: { id: number, label: string | null, scheduledAt: string | Date } | null
  assignedUser?: { id: number, displayName: string } | null
  confirmationIntros?: Array<{
    trialId: number
    firstName: string | null
    lastName: string | null
    programName: string | null
    scheduledAt: string | Date
    label: string | null
  }>
}

const { user } = useUserSession()
const route = useRoute()
const router = useRouter()
const canWrite = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'STAFF')
const allowedViews: TaskView[] = ['open', 'due_today', 'overdue', 'upcoming', 'completed', 'cancelled']
const initialView = typeof route.query.view === 'string' && allowedViews.includes(route.query.view as TaskView)
  ? route.query.view as TaskView
  : 'open'
const view = ref<TaskView>(initialView)
const errorMessage = ref('')
const completingId = ref<number | null>(null)
const outcome = ref<FollowUpCallOutcome>('REACHED')
const note = ref('')
const assigning = ref<Record<number, string>>({})
const cancelTarget = ref<QueueTask | null>(null)

const views: Array<{ id: TaskView, label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due_today', label: 'Due today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const { data: tasks, error, pending, refresh } = await useFetch<QueueTask[]>('/api/follow-up-tasks', {
  query: computed(() => ({ view: view.value })),
})
const { data: staff } = await useFetch<StaffUser[]>('/api/users')

const outcomes = Object.entries(FOLLOW_UP_CALL_OUTCOME_LABELS) as Array<[FollowUpCallOutcome, string]>

watch(view, (value) => {
  router.replace({ query: value === 'open' ? {} : { view: value } })
})

function dueMs(value: string | Date) {
  return new Date(value).getTime()
}

function typeLabel(type: string) {
  return type === 'PHONE_CALL' ? 'Phone call' : type
}

function urgencyLabel(task: QueueTask) {
  return dueStateLabel(task.dueState) || taskStatusLabel(task.status)
}

async function patchTask(id: number, body: Record<string, unknown>) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/follow-up-tasks/${id}`, { method: 'PATCH', body })
    completingId.value = null
    note.value = ''
    outcome.value = 'REACHED'
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not update that follow-up.'
  }
}

async function assign(task: QueueTask) {
  const raw = assigning.value[task.id]
  const assignedUserId = raw === '' || raw == null ? null : Number(raw)
  await patchTask(task.id, { action: 'assign', assignedUserId })
}

function startComplete(task: QueueTask) {
  completingId.value = task.id
  note.value = task.notes ?? ''
  outcome.value = 'REACHED'
}

function closeCancel(open: boolean) {
  if (!open) {
    cancelTarget.value = null
  }
}

function confirmCancel() {
  if (cancelTarget.value) {
    patchTask(cancelTarget.value.id, { action: 'cancel' })
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Follow-up"
      description="Call prospects who scheduled an intro. Open work is shown first."
    />

    <div
      class="-mx-1 overflow-x-auto px-1"
      role="tablist"
      aria-label="Follow-up views"
    >
      <div class="flex w-max gap-2 pb-1">
        <button
          v-for="item in views"
          :key="item.id"
          type="button"
          class="min-h-11 shrink-0 rounded-md border px-3 py-2 text-sm"
          :class="view === item.id
            ? 'border-navy-900 bg-navy-900 text-white'
            : 'border-line bg-paper text-navy-800 hover:border-navy-600/40'"
          :aria-pressed="view === item.id"
          @click="view = item.id"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load follow-up tasks.' }}
    </AppAlert>

    <p
      v-if="pending && !tasks"
      class="text-sm text-muted"
    >
      Loading follow-up…
    </p>

    <AppEmpty
      v-else-if="!error && !tasks?.length"
      title="No follow-up in this view"
      description="Try another filter, or schedule an intro to create the first confirmation call."
    />

    <ul
      v-else
      class="space-y-3"
    >
      <li
        v-for="task in tasks"
        :key="task.id"
        class="panel p-5"
        :class="task.dueState === 'OVERDUE' && task.status === 'PENDING' ? 'border-l-4 border-l-danger-700' : ''"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <NuxtLink
              :to="`/leads/${task.lead?.id}`"
              class="text-base font-semibold text-navy-900 hover:text-brand-700"
            >
              {{ personName(task.lead) }}
            </NuxtLink>
            <p class="mt-1 text-sm">
              <a
                v-if="task.lead?.phone"
                :href="`tel:${task.lead.phone}`"
                class="inline-flex min-h-11 items-center font-medium text-navy-800 hover:text-brand-700"
              >{{ task.lead.phone }}</a>
              <span
                v-else
                class="text-muted"
              >No phone on file</span>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <AppBadge :tone="dueStateTone(task.dueState) === 'neutral' ? 'muted' : dueStateTone(task.dueState)">
              {{ urgencyLabel(task) }}
            </AppBadge>
            <span class="sr-only">
              {{ typeLabel(task.type) }} · {{ taskStatusLabel(task.status) }}
            </span>
          </div>
        </div>

        <dl class="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">
          <div>
            <dt class="inline text-muted">
              Work
            </dt>
            <dd class="inline text-ink">
              {{ typeLabel(task.type) }}
              · {{ followUpPurposeLabel(task.purpose) }}
            </dd>
          </div>
          <div
            v-if="task.confirmationIntros?.length"
            class="sm:col-span-2"
          >
            <dt class="text-muted">
              Confirm intros
            </dt>
            <dd class="text-ink">
              <ul class="mt-1 space-y-1">
                <li
                  v-for="intro in task.confirmationIntros"
                  :key="intro.trialId"
                >
                  {{ personName({ firstName: intro.firstName, lastName: intro.lastName }, 'Prospect') }}
                  <span v-if="intro.programName"> — {{ intro.programName }}</span>
                  — {{ toBusinessDateTime(dueMs(intro.scheduledAt)) }}
                </li>
              </ul>
            </dd>
          </div>
          <div v-else-if="task.trial && task.purpose !== 'EVENT_FOLLOW_UP'">
            <dt class="inline text-muted">
              Intro
            </dt>
            <dd class="inline text-ink">
              {{ toBusinessDateTime(dueMs(task.trial.scheduledAt)) }}
              <span v-if="task.trial.label"> · {{ task.trial.label }}</span>
            </dd>
          </div>
          <div>
            <dt class="inline text-muted">
              Due
            </dt>
            <dd class="inline text-ink">
              {{ toBusinessDateTime(dueMs(task.dueAt)) }}
            </dd>
          </div>
          <div>
            <dt class="inline text-muted">
              Assigned
            </dt>
            <dd class="inline text-ink">
              {{ task.assignedUser?.displayName || 'Unassigned' }}
            </dd>
          </div>
        </dl>
        <p
          v-if="task.outcome"
          class="mt-2 text-sm text-ink"
        >
          Outcome: {{ FOLLOW_UP_CALL_OUTCOME_LABELS[task.outcome as FollowUpCallOutcome] || task.outcome }}
        </p>
        <p
          v-if="task.notes"
          class="mt-1 text-sm text-muted"
        >
          {{ task.notes }}
        </p>

        <div
          v-if="canWrite && task.status === 'PENDING'"
          class="mt-4 space-y-3 border-t border-line pt-3"
        >
          <div class="flex flex-wrap gap-2">
            <select
              :value="assigning[task.id] ?? (task.assignedUser?.id != null ? String(task.assignedUser.id) : '')"
              class="control max-w-xs"
              :aria-label="`Assign ${personName(task.lead)}`"
              @change="assigning[task.id] = ($event.target as HTMLSelectElement).value"
            >
              <option value="">
                Unassigned
              </option>
              <option
                v-for="person in staff"
                :key="person.id"
                :value="person.id"
              >
                {{ person.displayName }}
              </option>
            </select>
            <AppButton
              variant="secondary"
              @click="assign(task)"
            >
              Assign
            </AppButton>
            <AppButton @click="startComplete(task)">
              Complete
            </AppButton>
            <AppButton
              variant="ghost"
              @click="cancelTarget = task"
            >
              Cancel
            </AppButton>
          </div>
          <form
            v-if="completingId === task.id"
            class="space-y-3 rounded-md bg-canvas p-3"
            @submit.prevent="patchTask(task.id, { action: 'complete', outcome, notes: note || undefined })"
          >
            <AppField label="Call outcome">
              <select
                v-model="outcome"
                class="control"
              >
                <option
                  v-for="[value, label] in outcomes"
                  :key="value"
                  :value="value"
                >
                  {{ label }}
                </option>
              </select>
            </AppField>
            <AppField
              label="Note"
              hint="optional"
            >
              <textarea
                v-model="note"
                rows="2"
                class="control"
                placeholder="What happened on the call"
              />
            </AppField>
            <div class="flex flex-wrap gap-2">
              <AppButton type="submit">
                Save result
              </AppButton>
              <AppButton
                variant="ghost"
                type="button"
                @click="completingId = null"
              >
                Close
              </AppButton>
            </div>
          </form>
        </div>
      </li>
    </ul>

    <AppConfirm
      :open="Boolean(cancelTarget)"
      title="Cancel this follow-up?"
      description="The call will leave the open queue. History is kept."
      confirm-label="Cancel call"
      danger
      @update:open="closeCancel"
      @confirm="confirmCancel"
    />
  </section>
</template>
