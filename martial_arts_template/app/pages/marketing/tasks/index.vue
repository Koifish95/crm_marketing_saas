<script setup lang="ts">
import type { MarketingTaskType } from '#shared/schemas/enums'
import {
  dueStateLabel,
  dueStateTone,
  MARKETING_TASK_TYPES,
  marketingTaskStatusTone,
  marketingTaskTypeLabel,
  taskStatusLabel,
} from '#shared/utils/labels'
import { datetimeLocalValueToIso, toBusinessDateTime } from '#shared/utils/time'
import { campaignStaffPath } from '#shared/utils/campaign'
import { marketingTaskStaffPath } from '#shared/utils/task'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'Marketing Tasks',
})

type TaskView = 'overdue' | 'due_today' | 'upcoming' | 'all'

interface QueueTask {
  id: number
  title: string
  type: MarketingTaskType
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  dueAt: string | Date
  dueState?: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | null
  campaign?: { id: number, name: string } | null
  assignee?: { displayName: string } | null
}

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_MARKETING_TASKS')))
const view = ref<TaskView>('overdue')
const errorMessage = ref('')
const pending = ref(false)
const createOpen = ref(false)
const createDialog = ref<HTMLDialogElement | null>(null)
const { data: people } = await useFetch<Array<{ id: number, displayName: string }>>('/api/users')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')
const { data: tasks, error } = await useFetch<QueueTask[]>('/api/marketing/tasks', {
  query: computed(() => ({ view: view.value })),
})

watch(createOpen, async (value) => {
  await nextTick()
  if (!createDialog.value) {
    return
  }
  if (value && !createDialog.value.open) {
    createDialog.value.showModal()
  }
  if (!value && createDialog.value.open) {
    createDialog.value.close()
  }
})

const form = reactive({
  title: '',
  type: 'OTHER' as MarketingTaskType,
  dueAt: '',
  assigneeUserId: '' as string | number,
  campaignId: '' as string | number,
})

function resetCreate() {
  form.title = ''
  form.type = 'OTHER'
  form.dueAt = ''
  form.assigneeUserId = ''
  form.campaignId = ''
}

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function dueLabel(task: QueueTask) {
  return toBusinessDateTime(new Date(task.dueAt).getTime())
}

async function create() {
  if (!canManage.value) {
    return
  }
  const dueAt = datetimeLocalValueToIso(form.dueAt)
  if (!dueAt) {
    errorMessage.value = 'Choose a due date and time.'
    return
  }
  errorMessage.value = ''
  pending.value = true
  try {
    const created = await $fetch<{ id: number }>('/api/marketing/tasks', {
      method: 'POST',
      body: {
        title: form.title,
        type: form.type,
        dueAt,
        assigneeUserId: form.assigneeUserId ? Number(form.assigneeUserId) : undefined,
        campaignId: form.campaignId ? Number(form.campaignId) : undefined,
      },
    })
    createOpen.value = false
    resetCreate()
    await navigateTo(marketingTaskStaffPath(created.id))
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not create that Marketing Task.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="Marketing Tasks"
      description="Cross-campaign work queue. Open a task to work it. This list is separate from Lead Follow-up phone calls."
    >
      <template
        v-if="canManage"
        #actions
      >
        <AppButton @click="createOpen = true">
          New task
        </AppButton>
      </template>
    </AppPageHeader>
    <AppAlert v-if="error">
      Could not load Marketing Tasks.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <div class="flex flex-wrap gap-2">
      <AppButton
        v-for="item in [{ id: 'overdue', label: 'Overdue' }, { id: 'due_today', label: 'Due today' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'all', label: 'All' }]"
        :key="item.id"
        :variant="view === item.id ? 'primary' : 'subtle'"
        @click="view = item.id as TaskView"
      >
        {{ item.label }}
      </AppButton>
    </div>

    <AppEmpty
      v-if="!tasks?.length"
      title="No Marketing Tasks in this view"
      description="Assigned, overdue, and upcoming work will show here. Lead Follow-up stays on Follow-up."
    />

    <div
      v-else
      class="space-y-3 md:hidden"
    >
      <NuxtLink
        v-for="task in tasks"
        :key="task.id"
        :to="marketingTaskStaffPath(task.id)"
        class="panel block p-5"
      >
        <div class="flex min-w-0 flex-wrap items-start gap-2">
          <p class="min-w-0 break-words font-semibold text-navy-900">
            {{ task.title }}
          </p>
          <AppBadge
            class="ml-auto shrink-0"
            :tone="marketingTaskStatusTone(task.status)"
          >
            {{ taskStatusLabel(task.status) }}
          </AppBadge>
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ marketingTaskTypeLabel(task.type) }}
          · {{ task.campaign?.name || 'No campaign' }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ task.assignee?.displayName || 'Unassigned' }}
          · {{ dueLabel(task) }}
        </p>
        <AppBadge
          v-if="task.dueState"
          class="mt-2"
          :tone="dueStateTone(task.dueState)"
        >
          {{ dueStateLabel(task.dueState) }}
        </AppBadge>
      </NuxtLink>
    </div>

    <div
      v-if="tasks?.length"
      class="panel hidden overflow-x-auto md:block"
    >
      <table class="data-table">
        <thead class="border-b border-line bg-canvas text-muted">
          <tr>
            <th>
              Title
            </th>
            <th>
              Status
            </th>
            <th>
              Type
            </th>
            <th>
              Campaign
            </th>
            <th>
              Assignee
            </th>
            <th>
              Due
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="task in tasks"
            :key="task.id"
          >
            <td>
              <NuxtLink
                :to="marketingTaskStaffPath(task.id)"
                class="font-medium text-navy-900 hover:text-brand-700"
              >
                {{ task.title }}
              </NuxtLink>
            </td>
            <td>
              <div class="flex flex-wrap items-center gap-2">
                <AppBadge :tone="marketingTaskStatusTone(task.status)">
                  {{ taskStatusLabel(task.status) }}
                </AppBadge>
                <AppBadge
                  v-if="task.dueState"
                  :tone="dueStateTone(task.dueState)"
                >
                  {{ dueStateLabel(task.dueState) }}
                </AppBadge>
              </div>
            </td>
            <td>
              {{ marketingTaskTypeLabel(task.type) }}
            </td>
            <td>
              <NuxtLink
                v-if="task.campaign?.id"
                :to="campaignStaffPath(task.campaign.id)"
                class="hover:text-brand-700"
              >
                {{ task.campaign.name }}
              </NuxtLink>
              <template v-else>
                —
              </template>
            </td>
            <td>
              {{ task.assignee?.displayName || 'Unassigned' }}
            </td>
            <td>
              {{ dueLabel(task) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <dialog
      v-if="canManage"
      ref="createDialog"
      class="m-auto w-[min(100%-1.5rem,32rem)] rounded-lg border border-line bg-paper p-0 text-ink shadow-lg backdrop:bg-navy-950/50"
      @close="createOpen = false"
    >
      <form
        class="space-y-4 p-4 sm:p-6"
        @submit.prevent="create"
      >
        <div class="flex items-start justify-between gap-2">
          <h2 class="text-base font-semibold text-navy-900">
            New Marketing Task
          </h2>
          <button
            type="button"
            class="btn btn-ghost min-h-11 px-3"
            @click="createOpen = false"
          >
            Close
          </button>
        </div>
        <AppField
          label="Title"
          required
        >
          <input
            v-model="form.title"
            class="control"
            required
          >
        </AppField>
        <AppField label="Type">
          <select
            v-model="form.type"
            class="control"
          >
            <option
              v-for="item in MARKETING_TASK_TYPES"
              :key="item"
              :value="item"
            >
              {{ marketingTaskTypeLabel(item) }}
            </option>
          </select>
        </AppField>
        <AppField
          label="Due"
          required
        >
          <input
            v-model="form.dueAt"
            type="datetime-local"
            class="control"
            required
          >
        </AppField>
        <AppField label="Assignee">
          <select
            v-model="form.assigneeUserId"
            class="control"
          >
            <option value="">
              Unassigned
            </option>
            <option
              v-for="person in people ?? []"
              :key="person.id"
              :value="person.id"
            >
              {{ person.displayName }}
            </option>
          </select>
        </AppField>
        <AppField label="Campaign">
          <select
            v-model="form.campaignId"
            class="control"
          >
            <option value="">
              None
            </option>
            <option
              v-for="campaign in campaigns ?? []"
              :key="campaign.id"
              :value="campaign.id"
            >
              {{ campaign.name }}
            </option>
          </select>
        </AppField>
        <div class="flex flex-wrap gap-2">
          <AppButton
            type="submit"
            :loading="pending"
          >
            Create and open
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            @click="createOpen = false"
          >
            Close
          </AppButton>
        </div>
      </form>
    </dialog>
  </section>
</template>
