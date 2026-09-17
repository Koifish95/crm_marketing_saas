<script setup lang="ts">
import {
  assetUploadAllSucceeded,
  assetUploadSubmitLabel,
  buildAssetUploadFormData,
  createAssetUploadItems,
  runAssetUploadBatch,
  type AssetUploadItem,
} from '#shared/utils/asset-upload'

const props = defineProps<{
  open: boolean
  campaigns: Array<{ id: number, name: string }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'uploaded': [result: { ids: number[], failedCount: number }]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const displayName = ref('')
const description = ref('')
const campaignId = ref('')
const pending = ref(false)
const started = ref(false)
const errorMessage = ref('')
const previewUrl = ref('')
const previewKind = ref<'image' | 'video' | 'file' | ''>('')
const items = ref<AssetUploadItem[]>([])

const singleFile = computed(() => items.value.length === 1)
const submitLabel = computed(() => assetUploadSubmitLabel(items.value, {
  started: started.value,
  pending: pending.value,
}))

watch(() => props.open, async (value) => {
  await nextTick()
  if (!dialog.value) {
    return
  }
  if (value && !dialog.value.open) {
    dialog.value.showModal()
  }
  if (!value && dialog.value.open && !pending.value) {
    dialog.value.close()
  }
  if (!value && !pending.value) {
    reset()
  }
})

function close() {
  if (pending.value) {
    return
  }
  emit('update:open', false)
}

function onDialogClose() {
  if (pending.value) {
    dialog.value?.showModal()
    return
  }
  close()
}

function reset() {
  displayName.value = ''
  description.value = ''
  campaignId.value = ''
  errorMessage.value = ''
  pending.value = false
  started.value = false
  items.value = []
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  previewKind.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function setPreview(file: File | undefined) {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  previewKind.value = ''
  if (!file) {
    return
  }
  previewUrl.value = URL.createObjectURL(file)
  if (file.type.startsWith('image/')) {
    previewKind.value = 'image'
    return
  }
  if (file.type.startsWith('video/')) {
    previewKind.value = 'video'
    return
  }
  previewKind.value = 'file'
}

function onFileChange() {
  const files = [...(fileInput.value?.files ?? [])]
  items.value = createAssetUploadItems(files)
  started.value = false
  errorMessage.value = ''
  if (items.value.length === 1) {
    displayName.value = items.value[0]!.displayName
    setPreview(items.value[0]!.file)
    return
  }
  displayName.value = ''
  setPreview(undefined)
}

async function postAsset(input: { file: File, displayName: string, description?: string | null, campaignId?: string | number | null }) {
  return await $fetch<{ id: number }>('/api/marketing/assets', {
    method: 'POST',
    body: buildAssetUploadFormData(input),
  })
}

async function upload() {
  if (pending.value) {
    return
  }
  if (!items.value.length) {
    errorMessage.value = 'Choose a file.'
    return
  }
  if (singleFile.value && displayName.value.trim()) {
    items.value[0]!.displayName = displayName.value.trim()
  }
  errorMessage.value = ''
  pending.value = true
  started.value = true
  try {
    const result = await runAssetUploadBatch({
      items: items.value,
      shared: {
        description: description.value,
        campaignId: campaignId.value || null,
      },
      upload: postAsset,
    })
    if (result.createdIds.length) {
      emit('uploaded', { ids: result.createdIds, failedCount: result.failedCount })
    }
    if (!result.createdIds.length) {
      errorMessage.value = result.stoppedForAuth
        ? 'Sign-in expired. Sign in again, then retry the failed files.'
        : (items.value.find(item => item.errorMessage)?.errorMessage || 'Could not upload those assets.')
    }
  } finally {
    pending.value = false
  }
  if (assetUploadAllSucceeded(items.value)) {
    close()
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(100%-1.5rem,32rem)] max-h-[90vh] overflow-y-auto rounded-lg border border-line bg-paper p-0 text-ink shadow-lg backdrop:bg-navy-950/50"
    @close="onDialogClose"
  >
    <form
      class="space-y-4 p-4 sm:p-6"
      @submit.prevent="upload"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-navy-900">
            Upload assets
          </h2>
          <p class="mt-1 text-sm text-muted">
            Select one or many files. Each file becomes its own asset. Marketing-use is set after upload.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-ghost min-h-11 px-3"
          :disabled="pending"
          @click="close"
        >
          Close
        </button>
      </div>
      <AppAlert v-if="errorMessage">
        {{ errorMessage }}
      </AppAlert>
      <AppField
        label="Files"
        required
      >
        <input
          ref="fileInput"
          type="file"
          class="control"
          multiple
          :disabled="pending"
          @change="onFileChange"
        >
      </AppField>
      <div
        v-if="previewUrl && singleFile"
        class="overflow-hidden rounded-md border border-line bg-canvas"
      >
        <img
          v-if="previewKind === 'image'"
          :src="previewUrl"
          alt="Upload preview"
          class="max-h-56 w-full object-contain"
        >
        <video
          v-else-if="previewKind === 'video'"
          :src="previewUrl"
          controls
          class="max-h-56 w-full"
        />
        <p
          v-else
          class="p-4 text-sm text-muted"
        >
          Preview is not available for this file type.
        </p>
      </div>
      <AppAssetUploadStatus
        :items="items"
        :pending="pending"
        :show-summary="started && !pending"
      />
      <AppField
        v-if="singleFile"
        label="Display name"
      >
        <input
          v-model="displayName"
          class="control"
          :disabled="pending"
        >
      </AppField>
      <AppField label="Description">
        <input
          v-model="description"
          class="control"
          :disabled="pending"
        >
      </AppField>
      <AppField label="Campaign">
        <select
          v-model="campaignId"
          class="control"
          :disabled="pending"
        >
          <option value="">
            None
          </option>
          <option
            v-for="campaign in campaigns"
            :key="campaign.id"
            :value="String(campaign.id)"
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
          {{ submitLabel }}
        </AppButton>
        <AppButton
          variant="secondary"
          type="button"
          :disabled="pending"
          @click="close"
        >
          Cancel
        </AppButton>
      </div>
    </form>
  </dialog>
</template>
