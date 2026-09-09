<script setup lang="ts">
const props = defineProps<{
  open: boolean
  assets: Array<{
    id: number
    displayName: string
    mediaType: string
    campaignName?: string | null
    marketingUseStatus: string
    archived?: boolean
    disabled?: boolean
  }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [id: number]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const search = ref('')

watch(() => props.open, async (value) => {
  await nextTick()
  if (!dialog.value) {
    return
  }
  if (value && !dialog.value.open) {
    search.value = ''
    dialog.value.showModal()
  }
  if (!value && dialog.value.open) {
    dialog.value.close()
  }
})

const filtered = computed(() => {
  const needle = search.value.trim().toLowerCase()
  if (!needle) {
    return props.assets
  }
  return props.assets.filter(asset => asset.displayName.toLowerCase().includes(needle)
    || (asset.campaignName || '').toLowerCase().includes(needle))
})

function close() {
  emit('update:open', false)
}

function pick(id: number) {
  const asset = props.assets.find(row => row.id === id)
  if (asset?.disabled) {
    return
  }
  emit('select', id)
  close()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(100%-1.5rem,48rem)] max-h-[90vh] overflow-y-auto rounded-lg border border-line bg-paper p-0 text-ink shadow-lg backdrop:bg-navy-950/50"
    @close="close"
  >
    <div class="space-y-4 p-4 sm:p-6">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-navy-900">
            Choose media
          </h2>
          <p class="mt-1 text-sm text-muted">
            Archived files cannot be attached. Do not use and Restricted stay visible.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost min-h-11 px-3"
          @click="close"
        >
          Close
        </button>
      </div>
      <input
        v-model="search"
        type="search"
        class="control"
        placeholder="Search assets"
        aria-label="Search assets"
      >
      <AppEmpty
        v-if="!filtered.length"
        title="No matching assets"
        description="Upload media on the Assets page, then attach it here."
      />
      <div
        v-else
        class="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <AppAssetMediaCard
          v-for="asset in filtered"
          :id="asset.id"
          :key="asset.id"
          mode="button"
          :display-name="asset.displayName"
          :media-type="asset.mediaType"
          :campaign-name="asset.campaignName"
          :marketing-use-status="asset.marketingUseStatus"
          :archived="asset.archived"
          :disabled="asset.disabled"
          @select="pick"
        />
      </div>
    </div>
  </dialog>
</template>
