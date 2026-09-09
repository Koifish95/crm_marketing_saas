<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { AssetMarketingUse } from '#shared/schemas/enums'
import { assetFilePath, assetMediaKind, assetStaffPath } from '#shared/utils/asset'
import { campaignStaffPath } from '#shared/utils/campaign'
import { contentStaffPath } from '#shared/utils/content'
import { assetUseLabel, assetUseTone } from '#shared/utils/labels'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

interface AssetRow {
  id: number
  displayName: string
  originalFilename: string
  mediaType: string
  description: string | null
  campaignId: number | null
  contentItemId: number | null
  marketingUseStatus: AssetMarketingUse
  restrictionNote: string | null
  archived: boolean
  uploadedBy?: { displayName: string } | null
  campaign?: { id: number, name: string } | null
  contentItem?: { id: number, title: string } | null
  usages: Array<{
    id: number
    campaignId: number | null
    contentItemId: number | null
    usageKind: string
    campaign?: { id: number, name: string } | null
    contentItem?: { id: number, title: string } | null
  }>
}

interface AssetSummary {
  id: number
  displayName: string
  marketingUseStatus: AssetMarketingUse
  archived: boolean
}

const route = useRoute()
const assetId = computed(() => Number(route.params.id))

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_ASSETS')))
const errorMessage = ref('')
const saveNotice = ref('')
const saveError = ref('')
const useNotice = ref('')
const useError = ref('')

const { data: asset, refresh, pending, error } = await useFetch<AssetRow>(
  () => `/api/marketing/assets/${assetId.value}`,
)
const { data: summaries, pending: summariesPending } = await useFetch<AssetSummary[]>('/api/marketing/assets')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')
const { data: contentItems } = await useFetch<Array<{ id: number, title: string }>>('/api/marketing/content')

useHead({
  title: computed(() => asset.value?.displayName || 'Asset'),
})

const edit = reactive({
  displayName: '',
  description: '',
  campaignId: '' as string | number | null,
  contentItemId: '' as string | number | null,
  restrictionNote: '',
})

watch(asset, (row) => {
  if (!row) {
    return
  }
  edit.displayName = row.displayName
  edit.description = row.description ?? ''
  edit.campaignId = row.campaignId ?? ''
  edit.contentItemId = row.contentItemId ?? ''
  edit.restrictionNote = row.restrictionNote ?? ''
}, { immediate: true })

const selectorItems = computed(() => (summaries.value ?? []).map(row => ({
  id: row.id,
  label: row.displayName,
  badge: assetUseLabel(row.marketingUseStatus),
  badgeTone: assetUseTone(row.marketingUseStatus),
})))

const restrictionReady = computed(() => edit.restrictionNote.trim().length >= 3)

const usageCampaigns = computed(() => {
  const names = new Map<number, string>()
  if (asset.value?.campaign) {
    names.set(asset.value.campaign.id, asset.value.campaign.name)
  }
  for (const usage of asset.value?.usages ?? []) {
    if (usage.campaign) {
      names.set(usage.campaign.id, usage.campaign.name)
    }
  }
  return [...names.entries()].map(([id, name]) => ({ id, name }))
})

const usageContent = computed(() => {
  const titles = new Map<number, string>()
  if (asset.value?.contentItem) {
    titles.set(asset.value.contentItem.id, asset.value.contentItem.title)
  }
  for (const usage of asset.value?.usages ?? []) {
    if (usage.contentItem) {
      titles.set(usage.contentItem.id, usage.contentItem.title)
    }
  }
  return [...titles.entries()].map(([id, title]) => ({ id, title }))
})

const confirmDelete = ref(false)

function assetRecordTo(id: number): RouteLocationRaw {
  return assetStaffPath(id)
}

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function save() {
  if (!asset.value || !canManage.value) {
    return
  }
  saveNotice.value = ''
  saveError.value = ''
  try {
    await $fetch(`/api/marketing/assets/${asset.value.id}`, {
      method: 'PATCH',
      body: {
        displayName: edit.displayName,
        description: edit.description || null,
        campaignId: edit.campaignId === '' ? null : Number(edit.campaignId),
        contentItemId: edit.contentItemId === '' ? null : Number(edit.contentItemId),
        restrictionNote: edit.restrictionNote || null,
      },
    })
    await refresh()
    saveNotice.value = 'Saved.'
  } catch (caught) {
    saveError.value = apiError(caught, 'Could not save that asset.')
  }
}

async function setUse(status: AssetMarketingUse) {
  if (!asset.value || !canManage.value) {
    return
  }
  if ((status === 'RESTRICTED' || status === 'DO_NOT_USE') && !restrictionReady.value) {
    useError.value = 'Add a meaningful restriction reason before restricting or blocking this asset.'
    useNotice.value = ''
    return
  }
  useError.value = ''
  useNotice.value = ''
  try {
    await $fetch(`/api/marketing/assets/${asset.value.id}`, {
      method: 'PATCH',
      body: {
        marketingUseStatus: status,
        restrictionNote: edit.restrictionNote || null,
      },
    })
    await refresh()
    useNotice.value = `Marketing use is now ${assetUseLabel(status)}.`
  } catch (caught) {
    useError.value = apiError(caught, 'Could not update marketing-use status.')
  }
}

async function archive() {
  if (!asset.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/assets/${asset.value.id}`, {
      method: 'PATCH',
      body: { archived: true },
    })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not archive that asset.')
  }
}

async function remove() {
  if (!asset.value || !canManage.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/assets/${asset.value.id}`, { method: 'DELETE' })
    await navigateTo('/marketing/assets')
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not delete that asset.')
  }
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !asset && !error">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/marketing/assets"
          class="btn btn-secondary"
        >
          All assets
        </NuxtLink>
      </div>
    </template>

    <AppAlert v-if="error && !asset">
      Could not load that asset.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <AppEmpty
      v-if="!pending && !asset"
      title="Asset not found"
      description="That file is missing, or you do not have Marketing access. Use the selector to open another asset."
    >
      <NuxtLink
        to="/marketing/assets"
        class="btn btn-secondary"
      >
        Back to assets
      </NuxtLink>
    </AppEmpty>

    <template #header>
      <AppRecordSelector
        :items="selectorItems"
        :current-id="assetId"
        :record-to="assetRecordTo"
        record-kind="Asset"
        :current-label="asset?.displayName"
        :current-badge="asset ? assetUseLabel(asset.marketingUseStatus) : undefined"
        :current-badge-tone="asset ? assetUseTone(asset.marketingUseStatus) : undefined"
        :loading="summariesPending"
        search-placeholder="Search assets"
        aria-label="Select asset"
      >
        <template
          v-if="asset"
          #meta
        >
          <span>{{ asset.originalFilename }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ asset.uploadedBy?.displayName || 'Unknown' }}</span>
          <template v-if="asset.archived">
            <span aria-hidden="true">·</span>
            <span>Archived</span>
          </template>
          <span aria-hidden="true">·</span>
          <span>
            Campaign
            <NuxtLink
              v-if="asset.campaign"
              :to="campaignStaffPath(asset.campaign.id)"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              {{ asset.campaign.name }}
            </NuxtLink>
            <template v-else>none</template>
          </span>
          <template v-if="asset.contentItem">
            <span aria-hidden="true">·</span>
            <span>
              Content
              <NuxtLink
                :to="contentStaffPath(asset.contentItem.id)"
                class="font-medium text-brand-700 hover:text-brand-600"
              >
                {{ asset.contentItem.title }}
              </NuxtLink>
            </span>
          </template>
        </template>
      </AppRecordSelector>
    </template>
    <template
      v-if="asset"
      #actions
    >
      <a
        :href="`/api/marketing/assets/${asset.id}/file`"
        class="btn btn-subtle"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open file
      </a>
    </template>

    <div
      v-if="asset"
      class="overflow-hidden rounded-lg border border-line bg-canvas"
    >
      <img
        v-if="assetMediaKind(asset.mediaType) === 'image'"
        :src="assetFilePath(asset.id)"
        :alt="asset.displayName"
        class="max-h-[28rem] w-full object-contain"
      >
      <video
        v-else-if="assetMediaKind(asset.mediaType) === 'video'"
        :src="assetFilePath(asset.id)"
        controls
        preload="metadata"
        class="max-h-[28rem] w-full bg-navy-950"
        :aria-label="asset.displayName"
      />
      <p
        v-else
        class="p-6 text-sm text-muted"
      >
        Preview is not available for this file type. Use Open file.
      </p>
    </div>

    <AppPanel
      v-if="asset"
      title="Used in"
      description="Reusable through usage records. Direct campaign/content assignment is also shown. Content still belongs to one Campaign."
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">
            Campaigns
          </p>
          <ul
            v-if="usageCampaigns.length"
            class="mt-2 space-y-1 text-sm"
          >
            <li
              v-for="campaign in usageCampaigns"
              :key="`campaign-${campaign.id}`"
            >
              <NuxtLink
                :to="campaignStaffPath(campaign.id)"
                class="font-medium text-brand-700 hover:text-brand-600"
              >
                {{ campaign.name }}
              </NuxtLink>
            </li>
          </ul>
          <p
            v-else
            class="mt-2 text-sm text-muted"
          >
            Not used on a Campaign yet.
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">
            Content
          </p>
          <ul
            v-if="usageContent.length"
            class="mt-2 space-y-1 text-sm"
          >
            <li
              v-for="item in usageContent"
              :key="`content-${item.id}`"
            >
              <NuxtLink
                :to="contentStaffPath(item.id)"
                class="font-medium text-brand-700 hover:text-brand-600"
              >
                {{ item.title }}
              </NuxtLink>
            </li>
          </ul>
          <p
            v-else
            class="mt-2 text-sm text-muted"
          >
            Not attached to Content yet.
          </p>
        </div>
      </div>
    </AppPanel>

    <form
      v-if="asset && canManage"
      class="panel grid gap-3 p-5 sm:grid-cols-2"
      @submit.prevent="save"
    >
      <h2 class="sm:col-span-2 font-medium text-navy-900">
        Asset details
      </h2>
      <AppField label="Display name">
        <input
          v-model="edit.displayName"
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
      <AppField
        class="sm:col-span-2"
        label="Description"
      >
        <input
          v-model="edit.description"
          class="control"
        >
      </AppField>
      <AppField label="Content item">
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
      <AppField
        class="sm:col-span-2"
        label="Restriction reason"
        hint="Required to Restrict or Do not use (at least 3 characters)."
        :error="useError && !restrictionReady ? useError : undefined"
      >
        <textarea
          v-model="edit.restrictionNote"
          class="control min-h-20"
          placeholder="Why this file is restricted or blocked for marketing use"
        />
      </AppField>
      <div class="sm:col-span-2 flex flex-wrap items-center gap-2">
        <AppButton type="submit">
          Save
        </AppButton>
        <AppButton
          variant="subtle"
          type="button"
          @click="setUse('APPROVED')"
        >
          Approve use
        </AppButton>
        <AppButton
          variant="subtle"
          type="button"
          :disabled="!restrictionReady"
          @click="setUse('RESTRICTED')"
        >
          Restrict
        </AppButton>
        <AppButton
          variant="subtle"
          type="button"
          :disabled="!restrictionReady"
          @click="setUse('DO_NOT_USE')"
        >
          Do not use
        </AppButton>
        <AppButton
          v-if="asset.usages.length"
          variant="subtle"
          type="button"
          @click="archive"
        >
          Archive
        </AppButton>
        <AppButton
          v-else
          variant="ghost"
          type="button"
          @click="confirmDelete = true"
        >
          Delete
        </AppButton>
        <AppAlert
          v-if="saveNotice || useNotice"
          tone="success"
          class="w-full sm:w-auto"
        >
          {{ saveNotice || useNotice }}
        </AppAlert>
        <AppAlert
          v-if="saveError || (useError && restrictionReady)"
          class="w-full sm:w-auto"
        >
          {{ saveError || useError }}
        </AppAlert>
      </div>
    </form>
    <AppConfirm
      v-model:open="confirmDelete"
      title="Delete this asset?"
      description="The file is removed if it was never used in marketing history. Used assets must be archived instead."
      confirm-label="Delete"
      danger
      @confirm="remove"
    />
  </AppRecordWorkspace>
</template>
