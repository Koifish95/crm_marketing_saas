<script setup lang="ts">
import { assetMediaKind, assetStaffPath } from '#shared/utils/asset'
import { assetUseLabel } from '#shared/utils/labels'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'Assets',
})

interface AssetRow {
  id: number
  displayName: string
  originalFilename: string
  mediaType: string
  campaignId: number | null
  marketingUseStatus: string
  archived: boolean
  uploadedBy?: { displayName: string } | null
  campaign?: { id: number, name: string } | null
}

const route = useRoute()
const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_ASSETS')))
const { data: assets, refresh, error } = await useFetch<AssetRow[]>('/api/marketing/assets')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')

const uploadOpen = ref(false)
const filtersOpen = ref(false)
const moreId = ref<number | null>(null)
const uploadNotice = ref('')
const highlightedId = ref<number | null>(null)
const search = ref('')
const campaignFilter = ref(typeof route.query.campaignId === 'string' ? route.query.campaignId : '')
const typeFilter = ref('')
const useFilter = ref('')

const activeFilterCount = computed(() => [campaignFilter.value, typeFilter.value, useFilter.value].filter(Boolean).length)

const filtered = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return (assets.value ?? []).filter((asset) => {
    if (needle && !asset.displayName.toLowerCase().includes(needle) && !asset.originalFilename.toLowerCase().includes(needle)) {
      return false
    }
    if (campaignFilter.value && String(asset.campaignId) !== campaignFilter.value) {
      return false
    }
    if (typeFilter.value && assetMediaKind(asset.mediaType) !== typeFilter.value) {
      return false
    }
    if (useFilter.value && asset.marketingUseStatus !== useFilter.value) {
      return false
    }
    return true
  })
})

watch(
  () => route.query.campaignId,
  (value) => {
    campaignFilter.value = typeof value === 'string' ? value : campaignFilter.value
  },
)

async function onUploaded(id: number) {
  uploadNotice.value = 'Uploaded. Set marketing-use on the asset if staff should reuse it.'
  highlightedId.value = id
  await refresh()
  await nextTick()
  document.getElementById(`asset-card-${id}`)?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="Assets"
      description="Photos and videos for Campaign work. Open an asset to set marketing-use."
    >
      <template
        v-if="canManage"
        #actions
      >
        <AppButton @click="uploadOpen = true">
          Upload asset
        </AppButton>
      </template>
    </AppPageHeader>

    <AppAlert v-if="error">
      Could not load assets.
    </AppAlert>
    <AppAlert
      v-if="uploadNotice"
      tone="success"
    >
      {{ uploadNotice }}
    </AppAlert>
    <p class="text-xs text-muted">
      Marketing-use is Renzo’s determination for posting — not legal consent tracking.
    </p>

    <div class="space-y-3">
      <div class="flex gap-2">
        <input
          v-model="search"
          type="search"
          placeholder="Search assets"
          class="control min-w-0 flex-1"
          aria-label="Search assets"
        >
        <button
          type="button"
          class="btn btn-secondary shrink-0 md:hidden"
          @click="filtersOpen = true"
        >
          Filters{{ activeFilterCount ? ` (${activeFilterCount})` : '' }}
        </button>
      </div>
      <div class="hidden gap-3 md:grid md:grid-cols-3">
        <select
          v-model="campaignFilter"
          class="control"
          aria-label="Campaign"
        >
          <option value="">
            All campaigns
          </option>
          <option
            v-for="campaign in campaigns ?? []"
            :key="campaign.id"
            :value="String(campaign.id)"
          >
            {{ campaign.name }}
          </option>
        </select>
        <select
          v-model="typeFilter"
          class="control"
          aria-label="Type"
        >
          <option value="">
            All types
          </option>
          <option value="image">
            Image
          </option>
          <option value="video">
            Video
          </option>
          <option value="file">
            Other
          </option>
        </select>
        <select
          v-model="useFilter"
          class="control"
          aria-label="Marketing use"
        >
          <option value="">
            All use statuses
          </option>
          <option value="UNKNOWN">
            {{ assetUseLabel('UNKNOWN') }}
          </option>
          <option value="APPROVED">
            {{ assetUseLabel('APPROVED') }}
          </option>
          <option value="RESTRICTED">
            {{ assetUseLabel('RESTRICTED') }}
          </option>
          <option value="DO_NOT_USE">
            {{ assetUseLabel('DO_NOT_USE') }}
          </option>
        </select>
      </div>
    </div>

    <AppFilterSheet
      v-model:open="filtersOpen"
      title="Asset filters"
    >
      <div class="space-y-3">
        <select
          v-model="campaignFilter"
          class="control"
          aria-label="Campaign"
        >
          <option value="">
            All campaigns
          </option>
          <option
            v-for="campaign in campaigns ?? []"
            :key="campaign.id"
            :value="String(campaign.id)"
          >
            {{ campaign.name }}
          </option>
        </select>
        <select
          v-model="typeFilter"
          class="control"
          aria-label="Type"
        >
          <option value="">
            All types
          </option>
          <option value="image">
            Image
          </option>
          <option value="video">
            Video
          </option>
          <option value="file">
            Other
          </option>
        </select>
        <select
          v-model="useFilter"
          class="control"
          aria-label="Marketing use"
        >
          <option value="">
            All use statuses
          </option>
          <option value="UNKNOWN">
            {{ assetUseLabel('UNKNOWN') }}
          </option>
          <option value="APPROVED">
            {{ assetUseLabel('APPROVED') }}
          </option>
          <option value="RESTRICTED">
            {{ assetUseLabel('RESTRICTED') }}
          </option>
          <option value="DO_NOT_USE">
            {{ assetUseLabel('DO_NOT_USE') }}
          </option>
        </select>
      </div>
    </AppFilterSheet>

    <AppEmpty
      v-if="!assets?.length"
      title="No assets yet"
      description="Upload photos or clips staff captured for a Marketing Campaign."
    />
    <AppEmpty
      v-else-if="!filtered.length"
      title="No matching assets"
      description="Clear search or filters to see the library."
    />
    <div
      v-else
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <div
        v-for="asset in filtered"
        :id="`asset-card-${asset.id}`"
        :key="asset.id"
        :class="highlightedId === asset.id ? 'ring-2 ring-brand-500 rounded-lg' : ''"
      >
        <AppAssetMediaCard
          :id="asset.id"
          :display-name="asset.displayName"
          :media-type="asset.mediaType"
          :campaign-name="asset.campaign?.name"
          :marketing-use-status="asset.marketingUseStatus"
          :archived="asset.archived"
        >
          <template #overflow>
            <AppButton
              variant="ghost"
              type="button"
              @click="moreId = moreId === asset.id ? null : asset.id"
            >
              More
            </AppButton>
          </template>
        </AppAssetMediaCard>
        <AppOverflowMenu
          :open="moreId === asset.id"
          :title="asset.displayName"
          @update:open="moreId = $event ? asset.id : null"
        >
          <NuxtLink
            :to="assetStaffPath(asset.id)"
            class="btn btn-subtle min-h-11 w-full justify-start"
          >
            Open
          </NuxtLink>
        </AppOverflowMenu>
      </div>
    </div>

    <AppAssetUploadDialog
      v-if="canManage"
      v-model:open="uploadOpen"
      :campaigns="campaigns ?? []"
      @uploaded="onUploaded"
    />
  </section>
</template>
