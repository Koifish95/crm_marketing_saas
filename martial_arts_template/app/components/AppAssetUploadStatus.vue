<script setup lang="ts">
import type { AssetUploadItem } from '#shared/utils/asset-upload'
import { assetUploadProgressLabel, assetUploadSummaryText } from '#shared/utils/asset-upload'

const props = defineProps<{
  items: AssetUploadItem[]
  pending?: boolean
  showSummary?: boolean
}>()

const progressLabel = computed(() => assetUploadProgressLabel(props.items, Boolean(props.pending)))
const summary = computed(() => props.showSummary ? assetUploadSummaryText(props.items) : '')

function mark(item: AssetUploadItem) {
  if (item.status === 'SUCCESS') {
    return '✓'
  }
  if (item.status === 'FAILED') {
    return '✗'
  }
  if (item.status === 'UPLOADING') {
    return '…'
  }
  return '·'
}
</script>

<template>
  <div
    v-if="items.length"
    class="space-y-2"
  >
    <p
      v-if="progressLabel"
      class="text-sm text-muted"
    >
      {{ progressLabel }}
    </p>
    <ul class="space-y-1 text-sm">
      <li
        v-for="item in items"
        :key="item.key"
        class="break-all"
        :class="item.status === 'FAILED' ? 'text-danger-700' : 'text-ink'"
      >
        <span aria-hidden="true">{{ mark(item) }}</span>
        {{ item.file.name }}
        <template v-if="item.status === 'FAILED' && item.errorMessage">
          — {{ item.errorMessage }}
        </template>
      </li>
    </ul>
    <p
      v-if="summary"
      class="text-sm font-medium text-navy-900"
    >
      {{ summary }}
    </p>
  </div>
</template>
