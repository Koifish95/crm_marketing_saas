<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { ContentChannel, ContentStatus } from '#shared/schemas/enums'
import { campaignStaffPath } from '#shared/utils/campaign'
import { contentStaffPath } from '#shared/utils/content'
import {
  contentChannelLabel,
  contentStatusLabel,
  contentStatusTone,
} from '#shared/utils/labels'
import { datetimeLocalFromUnknown, datetimeLocalValueToIso, toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

interface Person {
  id: number
  displayName: string
}

interface LibraryAsset {
  id: number
  displayName: string
  mediaType: string
  contentItemId: number | null
  archived: boolean
  marketingUseStatus: string
  campaign?: { name: string } | null
}

interface ContentRow {
  id: number
  title: string
  body: string | null
  status: ContentStatus
  campaignId: number | null
  approvalRequired: boolean
  approvedAt: string | Date | null
  plannedPublishAt: string | Date | null
  notes: string | null
  campaign?: { id: number, name: string } | null
  publisher?: Person | null
  channels: Array<{ channel: ContentChannel }>
  publications: Array<{
    channel: string
    publicUrl: string | null
    externalPostId?: string | null
    publishedAt: string | Date
    recordedBy?: { displayName: string } | null
  }>
}

const route = useRoute()
const contentId = computed(() => Number(route.params.id))

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_CONTENT')))
const canApprove = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('APPROVE_CONTENT')))

const errorMessage = ref('')
const saveNotice = ref('')
const saveError = ref('')
const attachNotice = ref('')
const attachError = ref('')
const publishNotice = ref('')
const publishError = ref('')
const publishUrl = ref('')
const publishExternalId = ref('')
const publishChannel = ref<ContentChannel>('FACEBOOK')
const pickerOpen = ref(false)
const moreOpen = ref(false)
const moveTo = ref('')

const { data: item, refresh, pending, error } = await useFetch<ContentRow>(
  () => `/api/marketing/content/${contentId.value}`,
)
const { data: summaries, pending: summariesPending, refresh: refreshSummaries } = await useFetch<Array<{ id: number, title: string, status: ContentStatus }>>('/api/marketing/content')
const { data: people } = await useFetch<Person[]>('/api/users')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')
const { data: assets, refresh: refreshAssets } = await useFetch<LibraryAsset[]>('/api/marketing/assets')

useHead({
  title: computed(() => item.value?.title || 'Content'),
})

const selectorItems = computed(() => (summaries.value ?? []).map(row => ({
  id: row.id,
  label: row.title,
  badge: contentStatusLabel(row.status),
  badgeTone: contentStatusTone(row.status),
})))

function contentRecordTo(id: number): RouteLocationRaw {
  const campaignId = typeof route.query.campaignId === 'string' ? route.query.campaignId : item.value?.campaignId
  return contentStaffPath(id, { campaignId })
}

const campaignBackTo = computed(() => {
  const queryId = typeof route.query.campaignId === 'string' ? Number(route.query.campaignId) : NaN
  if (Number.isInteger(queryId) && queryId > 0) {
    return campaignStaffPath(queryId)
  }
  if (item.value?.campaignId) {
    return campaignStaffPath(item.value.campaignId)
  }
  return null
})

const edit = reactive({
  title: '',
  body: '',
  notes: '',
  campaignId: '' as string | number | null,
  publisherUserId: '' as string | number,
  approvalRequired: false,
  plannedPublishAt: '',
  channels: [] as ContentChannel[],
})

watch(item, (row) => {
  if (!row) {
    return
  }
  edit.title = row.title
  edit.body = row.body ?? ''
  edit.notes = row.notes ?? ''
  edit.campaignId = row.campaignId ?? ''
  edit.publisherUserId = row.publisher?.id ?? ''
  edit.approvalRequired = row.approvalRequired
  edit.plannedPublishAt = datetimeLocalFromUnknown(row.plannedPublishAt)
  edit.channels = row.channels.map(channel => channel.channel)
  if (!row.channels.some(channel => channel.channel === publishChannel.value)) {
    publishChannel.value = row.channels[0]?.channel ?? 'FACEBOOK'
  }
  moveTo.value = ''
}, { immediate: true })

const attachedAssets = computed(() => (assets.value ?? []).filter(asset => asset.contentItemId === contentId.value))
const pickerAssets = computed(() => (assets.value ?? [])
  .filter(asset => !asset.contentItemId)
  .map(asset => ({
    id: asset.id,
    displayName: asset.displayName,
    mediaType: asset.mediaType,
    campaignName: asset.campaign?.name,
    marketingUseStatus: asset.marketingUseStatus,
    archived: asset.archived,
    disabled: asset.archived,
  })))

const statusMoves = computed(() => {
  const status = item.value?.status
  if (!status || status === 'PUBLISHED' || status === 'CANCELLED') {
    return [] as Array<{ id: ContentStatus, label: string }>
  }
  const moves: Array<{ id: ContentStatus, label: string }> = []
  if (status === 'IDEA') {
    moves.push({ id: 'NEEDS_ASSETS', label: 'Needs assets' })
  }
  if (status !== 'DRAFT') {
    moves.push({ id: 'DRAFT', label: 'Draft' })
  }
  moves.push({ id: 'READY_TO_PUBLISH', label: 'Ready to publish' })
  return moves
})

const showApprove = computed(() => Boolean(canApprove.value && item.value?.approvalRequired && !item.value.approvedAt))
const showCancel = computed(() => item.value?.status !== 'CANCELLED' && item.value?.status !== 'PUBLISHED')

const nextAction = computed(() => {
  const row = item.value
  if (!row) {
    return ''
  }
  if (row.status === 'PUBLISHED') {
    return 'Publication recorded'
  }
  if (row.status === 'CANCELLED') {
    return 'Cancelled'
  }
  if (row.approvalRequired && !row.approvedAt) {
    return 'Needs approval before publish-ready'
  }
  if (row.status === 'READY_TO_PUBLISH') {
    return 'Record a manual publication'
  }
  if (row.status === 'NEEDS_ASSETS') {
    return 'Add media in Creative'
  }
  return 'Save changes, then move workflow state'
})

const channelMeta = computed(() => {
  const list = edit.channels.length ? edit.channels : (item.value?.channels.map(row => row.channel) ?? [])
  return list.map(channel => contentChannelLabel(channel)).join(' · ') || 'No channels'
})

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function toggleChannel(channel: ContentChannel) {
  if (edit.channels.includes(channel)) {
    edit.channels = edit.channels.filter(entry => entry !== channel)
    return
  }
  edit.channels = [...edit.channels, channel]
}

function whenLabel(value: string | Date | null | undefined) {
  if (!value) {
    return '—'
  }
  return toBusinessDateTime(new Date(value).getTime())
}

async function saveChanges() {
  if (!item.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  saveNotice.value = ''
  saveError.value = ''
  try {
    await $fetch(`/api/marketing/content/${item.value.id}`, {
      method: 'PATCH',
      body: {
        title: edit.title,
        body: edit.body,
        campaignId: edit.campaignId === '' ? null : Number(edit.campaignId),
        publisherUserId: edit.publisherUserId === '' ? null : Number(edit.publisherUserId),
        approvalRequired: edit.approvalRequired,
        plannedPublishAt: datetimeLocalValueToIso(edit.plannedPublishAt),
        notes: edit.notes,
        channels: edit.channels,
      },
    })
    await refresh()
    await refreshSummaries()
    saveNotice.value = 'Saved.'
  } catch (caught) {
    saveError.value = apiError(caught, 'Could not save that content.')
  }
}

async function setStatus(status: ContentStatus) {
  if (!item.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  saveError.value = ''
  try {
    await $fetch(`/api/marketing/content/${item.value.id}`, {
      method: 'PATCH',
      body: { status },
    })
    await refresh()
    await refreshSummaries()
    saveNotice.value = 'Status updated.'
    moveTo.value = ''
  } catch (caught) {
    saveError.value = apiError(caught, 'Could not update that content.')
    moveTo.value = ''
  }
}

async function onMove() {
  if (!moveTo.value) {
    return
  }
  await setStatus(moveTo.value as ContentStatus)
}

async function approve() {
  if (!item.value || !canApprove.value) {
    return
  }
  errorMessage.value = ''
  saveError.value = ''
  try {
    await $fetch(`/api/marketing/content/${item.value.id}/approve`, { method: 'POST' })
    await refresh()
    await refreshSummaries()
    saveNotice.value = 'Approved.'
  } catch (caught) {
    saveError.value = apiError(caught, 'Could not approve that content.')
  }
}

async function attachAsset(id: number) {
  if (!item.value || !canManage.value) {
    return
  }
  attachError.value = ''
  attachNotice.value = ''
  try {
    await $fetch(`/api/marketing/assets/${id}/attach`, {
      method: 'POST',
      body: { contentItemId: item.value.id },
    })
    await refresh()
    await refreshAssets()
    attachNotice.value = 'Asset attached.'
  } catch (caught) {
    attachError.value = apiError(caught, 'Could not attach that asset.')
  }
}

async function detachAsset(id: number) {
  if (!canManage.value) {
    return
  }
  attachError.value = ''
  attachNotice.value = ''
  try {
    await $fetch(`/api/marketing/assets/${id}`, {
      method: 'PATCH',
      body: { contentItemId: null },
    })
    await refreshAssets()
    attachNotice.value = 'Asset removed from this item. Usage history is kept.'
  } catch (caught) {
    attachError.value = apiError(caught, 'Could not remove that asset.')
  }
}

async function recordPublish() {
  if (!item.value || !canManage.value) {
    return
  }
  publishError.value = ''
  publishNotice.value = ''
  try {
    await $fetch(`/api/marketing/content/${item.value.id}/publications`, {
      method: 'POST',
      body: {
        channel: publishChannel.value,
        publicUrl: publishUrl.value || undefined,
        externalPostId: publishExternalId.value || undefined,
      },
    })
    publishUrl.value = ''
    publishExternalId.value = ''
    await refresh()
    publishNotice.value = 'Publication recorded. This does not post to Meta.'
  } catch (caught) {
    publishError.value = apiError(caught, 'Could not record publication.')
  }
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !item && !error">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/marketing/content"
          class="btn btn-secondary"
        >
          Content queue
        </NuxtLink>
        <NuxtLink
          v-if="campaignBackTo"
          :to="campaignBackTo"
          class="btn btn-subtle"
        >
          Back to Campaign
        </NuxtLink>
      </div>
    </template>

    <AppAlert v-if="errorMessage || saveError">
      {{ errorMessage || saveError }}
    </AppAlert>
    <AppAlert
      v-if="saveNotice"
      tone="success"
    >
      {{ saveNotice }}
    </AppAlert>
    <AppAlert v-if="error && !item">
      Could not load that content item.
    </AppAlert>

    <AppEmpty
      v-if="!pending && !item"
      title="Content not found"
      description="That item is missing, or you do not have Marketing access. Use the selector to open another item."
    >
      <NuxtLink
        to="/marketing/content"
        class="btn btn-secondary"
      >
        Back to content queue
      </NuxtLink>
    </AppEmpty>

    <template #header>
      <AppRecordSelector
        :items="selectorItems"
        :current-id="contentId"
        :record-to="contentRecordTo"
        record-kind="Content item"
        :current-label="item?.title"
        :current-badge="item ? contentStatusLabel(item.status) : undefined"
        :current-badge-tone="item ? contentStatusTone(item.status) : undefined"
        :loading="summariesPending"
        search-placeholder="Search content"
        aria-label="Select content item"
      >
        <template
          v-if="item"
          #meta
        >
          <template v-if="item.campaign">
            <NuxtLink
              :to="campaignStaffPath(item.campaign.id)"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              {{ item.campaign.name }}
            </NuxtLink>
          </template>
          <span v-else>No campaign</span>
          <span aria-hidden="true">·</span>
          <span>{{ channelMeta }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ nextAction }}</span>
        </template>
      </AppRecordSelector>
    </template>
    <template
      v-if="item && canManage"
      #actions
    >
      <AppButton
        type="button"
        @click="saveChanges"
      >
        Save changes
      </AppButton>
      <select
        v-if="statusMoves.length"
        v-model="moveTo"
        class="control w-auto min-w-44"
        aria-label="Move to status"
        @change="onMove"
      >
        <option value="">
          Move to…
        </option>
        <option
          v-for="move in statusMoves"
          :key="move.id"
          :value="move.id"
        >
          {{ move.label }}
        </option>
      </select>
      <AppButton
        v-if="showApprove"
        variant="secondary"
        type="button"
        @click="approve"
      >
        Approve
      </AppButton>
      <AppButton
        v-if="showCancel"
        variant="ghost"
        type="button"
        @click="moreOpen = true"
      >
        More
      </AppButton>
    </template>

    <template v-if="item">
      <AppOverflowMenu
        v-model:open="moreOpen"
        title="Content actions"
      >
        <button
          v-if="showCancel"
          type="button"
          class="btn btn-danger min-h-11 w-full justify-start"
          @click="setStatus('CANCELLED')"
        >
          Cancel item
        </button>
      </AppOverflowMenu>

      <section class="space-y-4">
        <h2 class="font-display text-lg font-semibold text-navy-900">
          Plan
        </h2>
        <div class="panel p-4 sm:p-6">
          <div
            v-if="canManage"
            class="grid gap-4 md:grid-cols-2"
          >
            <AppField
              class="md:col-span-2"
              label="Title"
            >
              <input
                v-model="edit.title"
                class="control"
              >
            </AppField>
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
            <AppField label="Publisher">
              <select
                v-model="edit.publisherUserId"
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
            <fieldset class="md:col-span-2">
              <legend class="mb-2 text-sm font-medium text-navy-900">
                Channels
              </legend>
              <div class="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
                <label
                  v-for="channel in (['FACEBOOK', 'INSTAGRAM', 'OTHER'] as ContentChannel[])"
                  :key="channel"
                  class="touch-row sm:min-w-40"
                >
                  <input
                    type="checkbox"
                    :checked="edit.channels.includes(channel)"
                    @change="toggleChannel(channel)"
                  >
                  {{ contentChannelLabel(channel) }}
                </label>
              </div>
            </fieldset>
            <AppField label="Planned publish">
              <input
                v-model="edit.plannedPublishAt"
                type="datetime-local"
                class="control"
              >
            </AppField>
            <label class="touch-row md:col-span-2">
              <input
                v-model="edit.approvalRequired"
                type="checkbox"
              >
              Approval required before publish-ready
            </label>
            <AppField
              class="md:col-span-2"
              label="Internal notes"
            >
              <textarea
                v-model="edit.notes"
                class="control min-h-20"
              />
            </AppField>
          </div>
          <dl
            v-else
            class="grid gap-3 text-sm md:grid-cols-2"
          >
            <div>
              <dt class="text-muted">
                Campaign
              </dt>
              <dd>{{ item.campaign?.name || 'None' }}</dd>
            </div>
            <div>
              <dt class="text-muted">
                Publisher
              </dt>
              <dd>{{ item.publisher?.displayName || 'Unassigned' }}</dd>
            </div>
            <div>
              <dt class="text-muted">
                Channels
              </dt>
              <dd>{{ channelMeta }}</dd>
            </div>
            <div>
              <dt class="text-muted">
                Planned publish
              </dt>
              <dd>{{ whenLabel(item.plannedPublishAt) }}</dd>
            </div>
            <div class="md:col-span-2">
              <dt class="text-muted">
                Notes
              </dt>
              <dd>{{ item.notes || 'No planning notes.' }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="font-display text-lg font-semibold text-navy-900">
          Creative
        </h2>
        <div class="panel space-y-5 p-4 sm:p-6">
          <AppField label="Post copy">
            <textarea
              v-if="canManage"
              v-model="edit.body"
              class="control min-h-48"
            />
            <p
              v-else
              class="whitespace-pre-wrap text-navy-800"
            >
              {{ item.body || 'No caption yet.' }}
            </p>
          </AppField>
          <div>
            <p class="mb-3 text-sm font-medium text-navy-900">
              Attached media
            </p>
            <AppAlert
              v-if="attachNotice"
              tone="success"
              class="mb-3"
            >
              {{ attachNotice }}
            </AppAlert>
            <AppAlert
              v-if="attachError"
              class="mb-3"
            >
              {{ attachError }}
            </AppAlert>
            <div
              v-if="attachedAssets.length"
              class="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <div
                v-for="asset in attachedAssets"
                :key="asset.id"
              >
                <AppAssetMediaCard
                  :id="asset.id"
                  :display-name="asset.displayName"
                  :media-type="asset.mediaType"
                  :campaign-name="asset.campaign?.name"
                  :marketing-use-status="asset.marketingUseStatus"
                  :archived="asset.archived"
                >
                  <template
                    v-if="canManage"
                    #overflow
                  >
                    <AppButton
                      variant="ghost"
                      type="button"
                      @click="detachAsset(asset.id)"
                    >
                      Remove
                    </AppButton>
                  </template>
                </AppAssetMediaCard>
              </div>
            </div>
            <p
              v-else
              class="text-sm text-muted"
            >
              No assets attached yet.
            </p>
            <AppButton
              v-if="canManage"
              class="mt-4"
              variant="secondary"
              type="button"
              @click="pickerOpen = true"
            >
              Add media
            </AppButton>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="font-display text-lg font-semibold text-navy-900">
          Publish
        </h2>
        <div class="panel space-y-5 p-4 sm:p-6">
          <p class="text-sm text-navy-900">
            {{ contentStatusLabel(item.status) }}
            <span class="text-muted"> · Planned {{ whenLabel(item.plannedPublishAt) }}</span>
          </p>
          <p class="text-xs text-muted">
            The app does not publish to Meta. Record the post after someone publishes it by hand.
          </p>
          <form
            v-if="canManage"
            class="grid gap-4 md:grid-cols-2"
            @submit.prevent="recordPublish"
          >
            <AppField label="Channel">
              <select
                v-model="publishChannel"
                class="control"
              >
                <option
                  v-for="channel in (edit.channels.length ? edit.channels : item.channels.map(row => row.channel))"
                  :key="channel"
                  :value="channel"
                >
                  {{ contentChannelLabel(channel) }}
                </option>
              </select>
            </AppField>
            <AppField label="Public URL">
              <input
                v-model="publishUrl"
                class="control"
                placeholder="https://"
              >
            </AppField>
            <AppField
              class="md:col-span-2"
              label="External post ID"
            >
              <input
                v-model="publishExternalId"
                class="control"
              >
            </AppField>
            <div>
              <AppButton type="submit">
                Record publication
              </AppButton>
            </div>
            <AppAlert
              v-if="publishNotice"
              tone="success"
              class="md:col-span-2"
            >
              {{ publishNotice }}
            </AppAlert>
            <AppAlert
              v-if="publishError"
              class="md:col-span-2"
            >
              {{ publishError }}
            </AppAlert>
          </form>
          <div>
            <p class="mb-3 text-sm font-medium text-navy-900">
              Publication history
            </p>
            <ul
              v-if="item.publications.length"
              class="space-y-3"
            >
              <li
                v-for="(pub, index) in item.publications"
                :key="index"
                class="rounded-md border border-line p-3 text-sm"
              >
                <p class="font-medium text-navy-900">
                  {{ contentChannelLabel(pub.channel) }}
                </p>
                <p class="mt-1 break-all text-muted">
                  {{ pub.publicUrl || 'URL not recorded' }}
                </p>
                <p class="mt-1 text-muted">
                  {{ whenLabel(pub.publishedAt) }}
                  <template v-if="pub.externalPostId">
                    · {{ pub.externalPostId }}
                  </template>
                  <template v-if="pub.recordedBy?.displayName">
                    · {{ pub.recordedBy.displayName }}
                  </template>
                </p>
              </li>
            </ul>
            <p
              v-else
              class="text-sm text-muted"
            >
              No publications recorded yet.
            </p>
          </div>
        </div>
      </section>
    </template>

    <AppAssetPicker
      v-if="canManage"
      v-model:open="pickerOpen"
      :assets="pickerAssets"
      @select="attachAsset"
    />
  </AppRecordWorkspace>
</template>
