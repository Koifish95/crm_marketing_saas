<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const dialog = ref<HTMLDialogElement | null>(null)

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
})

function close() {
  emit('update:open', false)
}

function confirm() {
  emit('confirm')
  close()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(100%-2rem,26rem)] rounded-lg border border-line bg-paper p-0 text-ink shadow-lg backdrop:bg-navy-950/50"
    @close="close"
  >
    <form
      class="space-y-4 p-5"
      @submit.prevent="confirm"
    >
      <div>
        <h2 class="text-base font-semibold text-navy-900">
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="mt-1 text-sm text-muted"
        >
          {{ description }}
        </p>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <AppButton
          variant="secondary"
          type="button"
          @click="close"
        >
          Keep it
        </AppButton>
        <AppButton
          :variant="danger ? 'danger' : 'primary'"
          type="submit"
        >
          {{ confirmLabel || 'Confirm' }}
        </AppButton>
      </div>
    </form>
  </dialog>
</template>
