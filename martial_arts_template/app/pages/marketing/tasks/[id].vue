<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { MarketingTaskType } from '#shared/schemas/enums'
import { assetFilePath, assetMediaKind } from '#shared/utils/asset'
import { campaignStaffPath } from '#shared/utils/campaign'
import { contentStaffPath } from '#shared/utils/content'
import { eventStaffPath } from '#shared/utils/event'
import {
  contentStatusLabel,
  contentStatusTone,
  dueStateLabel,
  dueStateTone,
  MARKETING_TASK_TYPES,
  marketingTaskStatusTone,
  marketingTaskTypeLabel,
  taskStatusLabel,
} from '#shared/utils/labels'
import { marketingTaskStaffPath } from '#shared/utils/task'
import { datetimeLocalFromUnknown, datetimeLocalValueToIso, toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

interface Person {
  id: number
  displayName: string
}

interface RelatedAsset {
  id: number
  displayName: string
  mediaType: string
  marketingUseStatus: string
  archived: boolean
  campaign?: { id: number, name: string } | null
}

interface QueueTask {
  id: number
  title: string
  type: MarketingTaskType
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  description: string | null
  notes: string | null
  dueAt: string | Date
  completedAt?: string | Date | null
  dueState?: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | null
  campaignId: number | null
  contentItemId: number | null
  assetId: number | null
  eventId: number | null
  campaign?: { id: number, name: string } | null
  contentItem?: {
    id: number
    title: string
    status?: string
    plannedPublishAt?: string | Date | null
    campaign?: { id: number, name: string } | null
  } | null
  asset?: RelatedAsset | null
  event?: { id: number, title: string } | null
  assignee?: Person | null
  assigneeUserId: number | null
}

interface TaskSummary {
  id: number
  title: string
  status: QueueTask['status']
  dueState?: QueueTask['dueState']
}

interface LibraryAsset {
  id: number
  displayName: string
  mediaType: string
  contentItemId: number | null
  marketingUseStatus: string
  archived: boolean
  campaign?: { name: string } | null
}

const route = useRoute()
const taskId = computed(() => Number(route.params.id))

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_MARKETING_TASKS')))
const errorMessage = ref('')
const saveNotice = ref('')
const taskEditing = ref(false)
const moreOpen = ref(false)
const cancelConfirmOpen = ref(false)
const pickerOpen = ref(false)

const { data: task, refresh, pending, error } = await useFetch<QueueTask>(
  () => `/api/marketing/tasks/${taskId.value}`,
)
const { data: summaries, pending: summariesPending, refresh: refreshSummaries } = await useFetch<TaskSummary[]>('/api/marketing/tasks', {
  query: { view: 'all' },
})
const { data: people } = await useFetch<Person[]>('/api/users')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')
const { data: contentItems } = await useFetch<Array<{ id: number, title: string }>>('/api/marketing/content')
const { data: assets } = await useFetch<LibraryAsset[]>('/api/marketing/assets')
const { data: events } = await useFetch<Array<{ id: number, title: string }>>('/api/marketing/events')

useHead({
  title: computed(() => task.value?.title || 'Marketing Task'),
})

const edit = reactive({
  title: '',
  type: 'OTHER' as MarketingTaskType,
  description: '',
  notes: '',
  dueAt: '',
  assigneeUserId: '' as string | number | null,
  campaignId: '' as string | number | null,
  contentItemId: '' as string | number | null,
  assetId: '' as string | number | null,
  eventId: '' as string | number | null,
})

function applyTaskToEdit(row: QueueTask) {
  edit.title = row.title
  edit.type = row.type
  edit.description = row.description ?? ''
  edit.notes = row.notes ?? ''
  edit.dueAt = datetimeLocalFromUnknown(row.dueAt)
  edit.assigneeUserId = row.assigneeUserId ?? ''
  edit.campaignId = row.campaignId ?? ''
  edit.contentItemId = row.contentItemId ?? ''
  edit.assetId = row.assetId ?? ''
  edit.eventId = row.eventId ?? ''
}

watch(task, (row) => {
  if (!row || taskEditing.value) {
    return
  }
  applyTaskToEdit(row)
}, { immediate: true })

watch(taskId, () => {
  taskEditing.value = false
  moreOpen.value = false
  saveNotice.value = ''
  errorMessage.value = ''
})

const selectorItems = computed(() => (summaries.value ?? []).map(row => ({
  id: row.id,
  label: row.title,
  badge: taskStatusLabel(row.status),
  badgeTone: marketingTaskStatusTone(row.status),
})))

const pickerAssets = computed(() => (assets.value ?? []).map(asset => ({
  id: asset.id,
  displayName: asset.displayName,
  mediaType: asset.mediaType,
  campaignName: asset.campaign?.name,
  marketingUseStatus: asset.marketingUseStatus,
  archived: asset.archived,
  disabled: asset.archived,
})))

const selectedAsset = computed(() => {
  const id = emptyToNull(edit.assetId)
  if (!id) {
    return null
  }
  return (assets.value ?? []).find(asset => asset.id === id) ?? task.value?.asset ?? null
})

const contentThumb = computed(() => {
  const contentId = task.value?.contentItemId
  if (!contentId) {
    return null
  }
  const attached = (assets.value ?? []).filter(asset => asset.contentItemId === contentId)
  return attached.find(asset => assetMediaKind(asset.mediaType) === 'image') || attached[0] || null
})

function taskRecordTo(id: number): RouteLocationRaw {
  return marketingTaskStaffPath(id)
}

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function emptyToNull(value: string | number | null) {
  if (value === '' || value == null) {
    return null
  }
  return Number(value)
}

function whenLabel(value: string | Date | null | undefined) {
  if (!value) {
    return ''
  }
  return toBusinessDateTime(new Date(value).getTime())
}

async function reload() {
  await refresh()
  await refreshSummaries()
}

function startEdit() {
  if (!task.value || !canManage.value) {
    return
  }
  applyTaskToEdit(task.value)
  taskEditing.value = true
  saveNotice.value = ''
  errorMessage.value = ''
  moreOpen.value = false
}

function discardEdit() {
  if (task.value) {
    applyTaskToEdit(task.value)
  }
  taskEditing.value = false
  errorMessage.value = ''
}

function pickAsset(id: number) {
  edit.assetId = id
}

function clearAsset() {
  edit.assetId = ''
}

async function save() {
  if (!task.value || !canManage.value) {
    return
  }
  const dueAt = datetimeLocalValueToIso(edit.dueAt)
  if (!dueAt) {
    errorMessage.value = 'Choose a due date and time.'
    saveNotice.value = ''
    return
  }
  errorMessage.value = ''
  saveNotice.value = ''
  try {
    await $fetch(`/api/marketing/tasks/${task.value.id}`, {
      method: 'PATCH',
      body: {
        title: edit.title,
        type: edit.type,
        description: edit.description || null,
        notes: edit.notes || null,
        dueAt,
        assigneeUserId: emptyToNull(edit.assigneeUserId),
        campaignId: emptyToNull(edit.campaignId),
        contentItemId: emptyToNull(edit.contentItemId),
        assetId: emptyToNull(edit.assetId),
        eventId: emptyToNull(edit.eventId),
      },
    })
    await reload()
    taskEditing.value = false
    if (task.value) {
      applyTaskToEdit(task.value)
    }
    saveNotice.value = 'Saved.'
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not update that Marketing Task.')
  }
}

async function completeTask() {
  if (!task.value || !canManage.value || task.value.status !== 'PENDING') {
    return
  }
  errorMessage.value = ''
  saveNotice.value = ''
  try {
    await $fetch(`/api/marketing/tasks/${task.value.id}`, {
      method: 'PATCH',
      body: { status: 'COMPLETED' },
    })
    await reload()
    taskEditing.value = false
    saveNotice.value = 'Marked complete.'
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not complete that Marketing Task.')
  }
}

async function confirmCancelTask() {
  if (!task.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  saveNotice.value = ''
  try {
    await $fetch(`/api/marketing/tasks/${task.value.id}`, {
      method: 'PATCH',
      body: { status: 'CANCELLED' },
    })
    await reload()
    taskEditing.value = false
    saveNotice.value = 'Task cancelled.'
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not cancel that Marketing Task.')
  }
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !task && !error">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/marketing/tasks"
          class="btn btn-secondary"
        >
          All tasks
        </NuxtLink>
      </div>
    </template>

    <AppAlert v-if="error && !task">
      Could not load that Marketing Task.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppAlert
      v-if="saveNotice"
      tone="success"
    >
      {{ saveNotice }}
    </AppAlert>

    <AppEmpty
      v-if="!pending && !task"
      title="Marketing Task not found"
      description="That task is missing, or you do not have Marketing access. Use the selector to open another task."
    >
      <NuxtLink
        to="/marketing/tasks"
        class="btn btn-secondary"
      >
        Back to task queue
      </NuxtLink>
    </AppEmpty>

    <template #header>
      <AppRecordSelector
        :items="selectorItems"
        :current-id="taskId"
        :record-to="taskRecordTo"
        record-kind="Marketing Task"
        :current-label="task?.title"
        :current-badge="task ? taskStatusLabel(task.status) : undefined"
        :current-badge-tone="task ? marketingTaskStatusTone(task.status) : undefined"
        :loading="summariesPending"
        search-placeholder="Search Marketing Tasks"
        aria-label="Select Marketing Task"
      >
        <template
          v-if="task"
          #meta
        >
          <span>{{ marketingTaskTypeLabel(task.type) }}</span>
          <span aria-hidden="true">·</span>
          <template v-if="task.status === 'COMPLETED' && task.completedAt">
            <span>Completed {{ whenLabel(task.completedAt) }}</span>
          </template>
          <template v-else>
            <AppBadge
              v-if="task.dueState"
              :tone="dueStateTone(task.dueState)"
            >
              {{ dueStateLabel(task.dueState) }}
            </AppBadge>
            <span aria-hidden="true">·</span>
            <span>Due {{ whenLabel(task.dueAt) }}</span>
          </template>
          <span aria-hidden="true">·</span>
          <span>{{ task.assignee?.displayName || 'Unassigned' }}</span>
          <template v-if="task.campaign">
            <span aria-hidden="true">·</span>
            <NuxtLink
              :to="campaignStaffPath(task.campaign.id)"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              {{ task.campaign.name }}
            </NuxtLink>
          </template>
        </template>
      </AppRecordSelector>
    </template>
    <template
      v-if="task && canManage"
      #actions
    >
      <AppButton
        v-if="task.status === 'PENDING'"
        type="button"
        @click="completeTask"
      >
        Complete task
      </AppButton>
      <AppButton
        v-if="!taskEditing"
        variant="secondary"
        type="button"
        @click="startEdit"
      >
        Edit
      </AppButton>
      <AppButton
        v-if="task.status !== 'CANCELLED'"
        variant="ghost"
        type="button"
        @click="moreOpen = true"
      >
        More
      </AppButton>
    </template>

    <form
      v-if="task && taskEditing && canManage"
      class="space-y-6"
      @submit.prevent="save"
    >
      <AppPanel title="Edit task">
        <AppFieldGroup title="Task">
          <AppField label="Title">
            <input
              v-model="edit.title"
              class="control"
            >
          </AppField>
          <AppField label="Type">
            <select
              v-model="edit.type"
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
            class="sm:col-span-2"
            label="Description"
          >
            <textarea
              v-model="edit.description"
              class="control min-h-20"
            />
          </AppField>
        </AppFieldGroup>
        <AppFieldGroup title="Assignment">
          <AppField label="Assignee">
            <select
              v-model="edit.assigneeUserId"
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
          <AppField label="Due">
            <input
              v-model="edit.dueAt"
              type="datetime-local"
              class="control"
            >
          </AppField>
        </AppFieldGroup>
        <AppFieldGroup title="Related work">
          <AppField label="Campaign">
            <select
              v-model="edit.campaignId"
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
          <AppField label="Related content">
            <select
              v-model="edit.contentItemId"
              class="control"
            >
              <option value="">
                None
              </option>
              <option
                v-for="item in contentItems ?? []"
                :key="item.id"
                :value="item.id"
              >
                {{ item.title }}
              </option>
            </select>
          </AppField>
          <AppField label="Related event">
            <select
              v-model="edit.eventId"
              class="control"
            >
              <option value="">
                None
              </option>
              <option
                v-for="item in events ?? []"
                :key="item.id"
                :value="item.id"
              >
                {{ item.title }}
              </option>
            </select>
          </AppField>
          <div class="sm:col-span-2 space-y-3">
            <p class="text-sm font-medium text-navy-900">
              Related asset
            </p>
            <div
              v-if="selectedAsset"
              class="max-w-xs"
            >
              <AppAssetMediaCard
                :id="selectedAsset.id"
                :display-name="selectedAsset.displayName"
                :media-type="selectedAsset.mediaType"
                :campaign-name="selectedAsset.campaign?.name"
                :marketing-use-status="selectedAsset.marketingUseStatus"
                :archived="selectedAsset.archived"
                mode="static"
              />
            </div>
            <p
              v-else
              class="text-sm text-muted"
            >
              Not linked
            </p>
            <div class="flex flex-wrap gap-2">
              <AppButton
                variant="secondary"
                type="button"
                @click="pickerOpen = true"
              >
                Choose media
              </AppButton>
              <AppButton
                v-if="selectedAsset"
                variant="ghost"
                type="button"
                @click="clearAsset"
              >
                Clear asset
              </AppButton>
            </div>
          </div>
        </AppFieldGroup>
        <AppFieldGroup title="Notes">
          <AppField
            class="sm:col-span-2"
            label="Notes"
          >
            <textarea
              v-model="edit.notes"
              class="control min-h-20"
            />
          </AppField>
        </AppFieldGroup>
        <div class="mt-6 flex flex-wrap items-center gap-2">
          <AppButton type="submit">
            Save changes
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            @click="discardEdit"
          >
            Discard changes
          </AppButton>
        </div>
      </AppPanel>
    </form>

    <div
      v-else-if="task"
      class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.85fr)]"
    >
      <div class="space-y-6">
        <section class="panel space-y-4 p-4 sm:p-6">
          <h2 class="font-display text-lg font-semibold text-navy-900">
            Task
          </h2>
          <AppBadge tone="neutral">
            {{ marketingTaskTypeLabel(task.type) }}
          </AppBadge>
          <p class="whitespace-pre-wrap text-navy-900">
            {{ task.description?.trim() || 'No description provided' }}
          </p>
        </section>
        <section class="panel space-y-4 p-4 sm:p-6">
          <h2 class="font-display text-lg font-semibold text-navy-900">
            Related work
          </h2>
          <dl class="space-y-4 text-sm">
            <div>
              <dt class="text-muted">
                Campaign
              </dt>
              <dd class="mt-1">
                <NuxtLink
                  v-if="task.campaign"
                  :to="campaignStaffPath(task.campaign.id)"
                  class="font-medium text-brand-700 hover:text-brand-600"
                >
                  {{ task.campaign.name }}
                </NuxtLink>
                <span
                  v-else
                  class="text-navy-900"
                >Not linked</span>
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                Content
              </dt>
              <dd class="mt-2">
                <template v-if="task.contentItem">
                  <div class="flex gap-3">
                    <img
                      v-if="contentThumb && assetMediaKind(contentThumb.mediaType) === 'image'"
                      :src="assetFilePath(contentThumb.id)"
                      :alt="task.contentItem.title"
                      class="size-16 shrink-0 rounded-md object-cover"
                    >
                    <div class="min-w-0">
                      <NuxtLink
                        :to="contentStaffPath(task.contentItem.id)"
                        class="font-medium text-brand-700 hover:text-brand-600"
                      >
                        {{ task.contentItem.title }}
                      </NuxtLink>
                      <p class="mt-1 flex flex-wrap items-center gap-2">
                        <AppBadge
                          v-if="task.contentItem.status"
                          :tone="contentStatusTone(task.contentItem.status)"
                        >
                          {{ contentStatusLabel(task.contentItem.status) }}
                        </AppBadge>
                        <span
                          v-if="task.contentItem.campaign?.name"
                          class="text-muted"
                        >
                          {{ task.contentItem.campaign.name }}
                        </span>
                      </p>
                      <p
                        v-if="task.contentItem.plannedPublishAt"
                        class="mt-1 text-muted"
                      >
                        Planned {{ whenLabel(task.contentItem.plannedPublishAt) }}
                      </p>
                    </div>
                  </div>
                </template>
                <span
                  v-else
                  class="text-navy-900"
                >Not linked</span>
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                Asset
              </dt>
              <dd class="mt-2">
                <div
                  v-if="task.asset"
                  class="max-w-xs"
                >
                  <AppAssetMediaCard
                    :id="task.asset.id"
                    :display-name="task.asset.displayName"
                    :media-type="task.asset.mediaType"
                    :campaign-name="task.asset.campaign?.name"
                    :marketing-use-status="task.asset.marketingUseStatus"
                    :archived="task.asset.archived"
                  />
                </div>
                <span
                  v-else
                  class="text-navy-900"
                >Not linked</span>
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                Event
              </dt>
              <dd class="mt-1">
                <NuxtLink
                  v-if="task.event"
                  :to="eventStaffPath(task.event.id)"
                  class="font-medium text-brand-700 hover:text-brand-600"
                >
                  {{ task.event.title }}
                </NuxtLink>
                <span
                  v-else
                  class="text-navy-900"
                >Not linked</span>
              </dd>
            </div>
          </dl>
        </section>
        <section class="panel space-y-3 p-4 sm:p-6">
          <h2 class="font-display text-lg font-semibold text-navy-900">
            Notes
          </h2>
          <p class="whitespace-pre-wrap text-sm text-navy-900">
            {{ task.notes?.trim() || 'No notes' }}
          </p>
        </section>
      </div>
      <div class="space-y-6">
        <section class="panel space-y-4 p-4 sm:p-6">
          <h2 class="font-display text-lg font-semibold text-navy-900">
            Assignment
          </h2>
          <dl class="space-y-4 text-sm">
            <div>
              <dt class="text-muted">
                Assignee
              </dt>
              <dd class="mt-1 text-navy-900">
                {{ task.assignee?.displayName || 'Unassigned' }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                Due
              </dt>
              <dd class="mt-1 text-navy-900">
                {{ whenLabel(task.dueAt) }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                Status
              </dt>
              <dd class="mt-1 flex flex-wrap items-center gap-2">
                <AppBadge :tone="marketingTaskStatusTone(task.status)">
                  {{ taskStatusLabel(task.status) }}
                </AppBadge>
                <AppBadge
                  v-if="task.dueState"
                  :tone="dueStateTone(task.dueState)"
                >
                  {{ dueStateLabel(task.dueState) }}
                </AppBadge>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>

    <AppOverflowMenu
      v-model:open="moreOpen"
      title="Task actions"
    >
      <button
        v-if="task && task.status !== 'CANCELLED'"
        type="button"
        class="btn btn-danger min-h-11 w-full justify-start"
        @click="cancelConfirmOpen = true"
      >
        Cancel task
      </button>
    </AppOverflowMenu>
    <AppConfirm
      :open="cancelConfirmOpen"
      title="Cancel this task"
      description="Cancelled tasks leave the open queue. This does not discard unsaved edits."
      confirm-label="Cancel task"
      danger
      @update:open="cancelConfirmOpen = $event"
      @confirm="confirmCancelTask"
    />
    <AppAssetPicker
      v-if="canManage"
      v-model:open="pickerOpen"
      :assets="pickerAssets"
      @select="pickAsset"
    />
  </AppRecordWorkspace>
</template>
