<script setup lang="ts">
import type { ContentChannel } from '#shared/schemas/enums'
import { assetFilePath, assetMediaKind } from '#shared/utils/asset'
import { contentStaffPath } from '#shared/utils/content'
import {
  contentChannelLabel,
  contentStatusLabel,
  contentStatusTone,
} from '#shared/utils/labels'
import { toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'Content',
})

interface ContentRow {
  id: number
  title: string
  status: string
  campaignId: number | null
  plannedPublishAt?: string | Date | null
  campaign?: { id: number, name: string } | null
  channels: Array<{ channel: ContentChannel }>
  publisher?: { displayName: string } | null
}

interface AssetThumb {
  id: number
  contentItemId: number | null
  mediaType: string
}

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_CONTENT')))
const errorMessage = ref('')
const pending = ref(false)
const createOpen = ref(false)
const createDialog = ref<HTMLDialogElement | null>(null)
const { data: items, error } = await useFetch<ContentRow[]>('/api/marketing/content')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')
const { data: assets } = await useFetch<AssetThumb[]>('/api/marketing/assets')

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
  campaignId: '' as string | number,
  approvalRequired: false,
  channels: ['FACEBOOK', 'INSTAGRAM'] as ContentChannel[],
})

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function toggleChannel(channel: ContentChannel) {
  if (form.channels.includes(channel)) {
    form.channels = form.channels.filter(item => item !== channel)
    return
  }
  form.channels = [...form.channels, channel]
}

function channelSummary(item: ContentRow) {
  return item.channels.map(row => contentChannelLabel(row.channel)).join(', ') || 'No channels'
}

function plannedLabel(item: ContentRow) {
  if (!item.plannedPublishAt) {
    return 'No planned date'
  }
  return toBusinessDateTime(new Date(item.plannedPublishAt).getTime())
}

const thumbsByContent = computed(() => {
  const map = new Map<number, AssetThumb>()
  for (const asset of assets.value ?? []) {
    if (!asset.contentItemId) {
      continue
    }
    const current = map.get(asset.contentItemId)
    const preferImage = !current
      || (assetMediaKind(asset.mediaType) === 'image' && assetMediaKind(current.mediaType) !== 'image')
    if (preferImage) {
      map.set(asset.contentItemId, asset)
    }
  }
  return map
})

function thumbFor(itemId: number) {
  return thumbsByContent.value.get(itemId) ?? null
}

function resetCreate() {
  form.title = ''
  form.campaignId = ''
  form.approvalRequired = false
  form.channels = ['FACEBOOK', 'INSTAGRAM']
}

async function create() {
  if (!canManage.value) {
    return
  }
  errorMessage.value = ''
  pending.value = true
  try {
    const created = await $fetch<{ id: number }>('/api/marketing/content', {
      method: 'POST',
      body: {
        title: form.title,
        campaignId: form.campaignId ? Number(form.campaignId) : undefined,
        approvalRequired: form.approvalRequired,
        channels: form.channels,
        status: form.approvalRequired ? 'NEEDS_REVIEW' : 'IDEA',
      },
    })
    createOpen.value = false
    resetCreate()
    await navigateTo(contentStaffPath(created.id))
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not create that content.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="Content"
      description="Plan copy, choose media, and record a manual publish. The app does not post to Meta."
    >
      <template
        v-if="canManage"
        #actions
      >
        <AppButton @click="createOpen = true">
          New content
        </AppButton>
      </template>
    </AppPageHeader>
    <AppAlert v-if="error">
      Could not load content.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <AppEmpty
      v-if="!items?.length"
      title="No managed content"
      description="Spontaneous organic posts do not need a record. Create an item when work is part of a Marketing Campaign."
    />

    <div
      v-else
      class="space-y-3 md:hidden"
    >
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="contentStaffPath(item.id)"
        class="panel flex gap-3 overflow-hidden p-3"
      >
        <img
          v-if="thumbFor(item.id) && assetMediaKind(thumbFor(item.id)!.mediaType) === 'image'"
          :src="assetFilePath(thumbFor(item.id)!.id)"
          :alt="item.title"
          class="size-16 shrink-0 rounded-md object-cover"
        >
        <div
          v-else-if="thumbFor(item.id)"
          class="flex size-16 shrink-0 items-center justify-center rounded-md bg-canvas text-xs text-muted"
        >
          Media
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 flex-wrap items-start gap-2">
            <p class="min-w-0 break-words font-semibold text-navy-900">
              {{ item.title }}
            </p>
            <AppBadge
              class="ml-auto shrink-0"
              :tone="contentStatusTone(item.status)"
            >
              {{ contentStatusLabel(item.status) }}
            </AppBadge>
          </div>
          <p class="mt-1 text-sm text-muted">
            {{ item.campaign?.name || 'No campaign' }}
            · {{ channelSummary(item) }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ item.publisher?.displayName || 'Unassigned' }}
            · {{ plannedLabel(item) }}
          </p>
        </div>
      </NuxtLink>
    </div>

    <div
      v-if="items?.length"
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
              Campaign
            </th>
            <th>
              Channels
            </th>
            <th>
              Planned
            </th>
            <th>
              Publisher
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
          >
            <td>
              <div class="flex items-center gap-3">
                <img
                  v-if="thumbFor(item.id) && assetMediaKind(thumbFor(item.id)!.mediaType) === 'image'"
                  :src="assetFilePath(thumbFor(item.id)!.id)"
                  :alt="item.title"
                  class="size-10 shrink-0 rounded-md object-cover"
                >
                <NuxtLink
                  :to="contentStaffPath(item.id)"
                  class="font-medium text-navy-900 hover:text-brand-700"
                >
                  {{ item.title }}
                </NuxtLink>
              </div>
            </td>
            <td>
              <AppBadge :tone="contentStatusTone(item.status)">
                {{ contentStatusLabel(item.status) }}
              </AppBadge>
            </td>
            <td>
              {{ item.campaign?.name || '—' }}
            </td>
            <td>
              {{ channelSummary(item) }}
            </td>
            <td>
              {{ plannedLabel(item) }}
            </td>
            <td>
              {{ item.publisher?.displayName || 'Unassigned' }}
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
            New content item
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
        <fieldset>
          <legend class="mb-2 text-sm font-medium text-navy-900">
            Channels
          </legend>
          <label
            v-for="channel in (['FACEBOOK', 'INSTAGRAM', 'OTHER'] as ContentChannel[])"
            :key="channel"
            class="touch-row"
          >
            <input
              type="checkbox"
              :checked="form.channels.includes(channel)"
              @change="toggleChannel(channel)"
            >
            {{ contentChannelLabel(channel) }}
          </label>
        </fieldset>
        <label class="touch-row">
          <input
            v-model="form.approvalRequired"
            type="checkbox"
          >
          Approval required before publish-ready
        </label>
        <AppButton
          type="submit"
          :loading="pending"
        >
          Create and open
        </AppButton>
      </form>
    </dialog>
  </section>
</template>
