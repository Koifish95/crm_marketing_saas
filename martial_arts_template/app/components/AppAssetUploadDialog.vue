<script setup lang="ts">
const props = defineProps<{
  open: boolean
  campaigns: Array<{ id: number, name: string }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'uploaded': [id: number]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const displayName = ref('')
const description = ref('')
const campaignId = ref('')
const pending = ref(false)
const errorMessage = ref('')
const previewUrl = ref('')
const previewKind = ref<'image' | 'video' | 'file' | ''>('')

watch(() => props.open, async (value) => {
  await nextTick()
  if (!dialog.value) {
    return
  }
  if (value && !dialog.value.open) {
    dialog.value.showModal()
  }
  if (!value && dialog.value.open) {
    dialog.value.close()
  }
  if (!value) {
    reset()
  }
})

function close() {
  emit('update:open', false)
}

function reset() {
  displayName.value = ''
  description.value = ''
  campaignId.value = ''
  errorMessage.value = ''
  pending.value = false
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  previewKind.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function onFileChange() {
  const file = fileInput.value?.files?.[0]
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  previewKind.value = ''
  if (!file) {
    return
  }
  if (!displayName.value.trim()) {
    displayName.value = file.name.replace(/\.[^.]+$/, '') || file.name
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

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function upload() {
  const file = fileInput.value?.files?.[0]
  if (!file) {
    errorMessage.value = 'Choose a file.'
    return
  }
  errorMessage.value = ''
  pending.value = true
  const body = new FormData()
  body.append('file', file)
  body.append('displayName', displayName.value || file.name)
  if (description.value.trim()) {
    body.append('description', description.value.trim())
  }
  if (campaignId.value) {
    body.append('campaignId', campaignId.value)
  }
  try {
    const created = await $fetch<{ id: number }>('/api/marketing/assets', { method: 'POST', body })
    emit('uploaded', created.id)
    close()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not upload that asset.')
  } finally {
    pending.value = false
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
    @close="close"
  >
    <form
      class="space-y-4 p-4 sm:p-6"
      @submit.prevent="upload"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="text-base font-semibold text-navy-900">
            Upload asset
          </h2>
          <p class="mt-1 text-sm text-muted">
            Marketing-use is set after upload. This is not a legal consent system.
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
      <AppAlert v-if="errorMessage">
        {{ errorMessage }}
      </AppAlert>
      <AppField
        label="File"
        required
      >
        <input
          ref="fileInput"
          type="file"
          class="control"
          required
          @change="onFileChange"
        >
      </AppField>
      <div
        v-if="previewUrl"
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
      <AppField label="Display name">
        <input
          v-model="displayName"
          class="control"
        >
      </AppField>
      <AppField label="Description">
        <input
          v-model="description"
          class="control"
        >
      </AppField>
      <AppField label="Campaign">
        <select
          v-model="campaignId"
          class="control"
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
          Upload
        </AppButton>
        <AppButton
          variant="secondary"
          type="button"
          @click="close"
        >
          Cancel
        </AppButton>
      </div>
    </form>
  </dialog>
</template>
