<script setup lang="ts">
import { assetFilePath, assetMediaKind, assetStaffPath, assetTypeLabel } from '#shared/utils/asset'
import { assetUseLabel, assetUseTone } from '#shared/utils/labels'

const props = withDefaults(defineProps<{
  id: number
  displayName: string
  mediaType: string
  campaignName?: string | null
  marketingUseStatus: string
  archived?: boolean
  mode?: 'link' | 'button' | 'static'
  disabled?: boolean
}>(), {
  campaignName: null,
  archived: false,
  mode: 'link',
  disabled: false,
})

const emit = defineEmits<{
  select: [id: number]
}>()

const kind = computed(() => assetMediaKind(props.mediaType))
const src = computed(() => assetFilePath(props.id))

function onSelect() {
  if (props.disabled) {
    return
  }
  emit('select', props.id)
}
</script>

<template>
  <NuxtLink
    v-if="mode === 'link'"
    :to="assetStaffPath(id)"
    class="panel block overflow-hidden text-left"
  >
    <div class="relative aspect-[4/3] bg-canvas">
      <img
        v-if="kind === 'image'"
        :src="src"
        :alt="displayName"
        loading="lazy"
        class="size-full object-cover"
      >
      <video
        v-else-if="kind === 'video'"
        :src="src"
        muted
        preload="metadata"
        playsinline
        class="size-full object-cover"
        :aria-label="displayName"
      />
      <div
        v-else
        class="flex size-full items-center justify-center px-3 text-center text-sm text-muted"
      >
        {{ assetTypeLabel(mediaType) }}
      </div>
      <span
        v-if="kind === 'video'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span class="rounded-full bg-navy-950/70 px-3 py-1 text-sm font-medium text-white">
          ▶
        </span>
      </span>
      <span
        v-if="archived"
        class="absolute left-2 top-2 rounded-md bg-navy-950/70 px-2 py-0.5 text-xs font-medium text-white"
      >
        Archived
      </span>
    </div>
    <div class="space-y-1 p-3">
      <div class="flex items-start gap-2">
        <p class="min-w-0 flex-1 break-words font-medium text-navy-900">
          {{ displayName }}
        </p>
        <div
          v-if="$slots.overflow"
          class="shrink-0"
          @click.prevent.stop
        >
          <slot name="overflow" />
        </div>
      </div>
      <p class="text-sm text-muted">
        {{ campaignName || 'No campaign' }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted">{{ assetTypeLabel(mediaType) }}</span>
        <AppBadge :tone="assetUseTone(marketingUseStatus)">
          {{ assetUseLabel(marketingUseStatus) }}
        </AppBadge>
      </div>
    </div>
  </NuxtLink>
  <button
    v-else-if="mode === 'button'"
    type="button"
    class="panel block w-full overflow-hidden text-left disabled:cursor-not-allowed disabled:opacity-60"
    :disabled="disabled"
    @click="onSelect"
  >
    <div class="relative aspect-[4/3] bg-canvas">
      <img
        v-if="kind === 'image'"
        :src="src"
        :alt="displayName"
        loading="lazy"
        class="size-full object-cover"
      >
      <video
        v-else-if="kind === 'video'"
        :src="src"
        muted
        preload="metadata"
        playsinline
        class="size-full object-cover"
        :aria-label="displayName"
      />
      <div
        v-else
        class="flex size-full items-center justify-center px-3 text-center text-sm text-muted"
      >
        {{ assetTypeLabel(mediaType) }}
      </div>
      <span
        v-if="kind === 'video'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span class="rounded-full bg-navy-950/70 px-3 py-1 text-sm font-medium text-white">
          ▶
        </span>
      </span>
      <span
        v-if="archived"
        class="absolute left-2 top-2 rounded-md bg-navy-950/70 px-2 py-0.5 text-xs font-medium text-white"
      >
        Archived
      </span>
    </div>
    <div class="space-y-1 p-3">
      <p class="min-w-0 break-words font-medium text-navy-900">
        {{ displayName }}
      </p>
      <p class="text-sm text-muted">
        {{ campaignName || 'No campaign' }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted">{{ assetTypeLabel(mediaType) }}</span>
        <AppBadge :tone="assetUseTone(marketingUseStatus)">
          {{ assetUseLabel(marketingUseStatus) }}
        </AppBadge>
      </div>
    </div>
  </button>
  <div
    v-else
    class="panel overflow-hidden"
  >
    <div class="relative aspect-[4/3] bg-canvas">
      <img
        v-if="kind === 'image'"
        :src="src"
        :alt="displayName"
        loading="lazy"
        class="size-full object-cover"
      >
      <video
        v-else-if="kind === 'video'"
        :src="src"
        muted
        preload="metadata"
        playsinline
        class="size-full object-cover"
        :aria-label="displayName"
      />
      <div
        v-else
        class="flex size-full items-center justify-center px-3 text-center text-sm text-muted"
      >
        {{ assetTypeLabel(mediaType) }}
      </div>
      <span
        v-if="kind === 'video'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span class="rounded-full bg-navy-950/70 px-3 py-1 text-sm font-medium text-white">
          ▶
        </span>
      </span>
    </div>
    <div class="space-y-1 p-3">
      <p class="min-w-0 break-words font-medium text-navy-900">
        {{ displayName }}
      </p>
      <p class="text-sm text-muted">
        {{ campaignName || 'No campaign' }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted">{{ assetTypeLabel(mediaType) }}</span>
        <AppBadge :tone="assetUseTone(marketingUseStatus)">
          {{ assetUseLabel(marketingUseStatus) }}
        </AppBadge>
      </div>
    </div>
  </div>
</template>
