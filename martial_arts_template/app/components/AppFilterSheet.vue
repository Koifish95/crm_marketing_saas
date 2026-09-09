<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
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
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(100%-2rem,26rem)] rounded-lg border border-line bg-paper p-0 text-ink shadow-lg backdrop:bg-navy-950/50"
    @close="close"
  >
    <div class="space-y-4 p-4">
      <div class="flex items-start justify-between gap-2">
        <h2 class="text-base font-semibold text-navy-900">
          {{ title || 'Filters' }}
        </h2>
        <button
          type="button"
          class="btn btn-ghost px-3"
          @click="close"
        >
          Close
        </button>
      </div>
      <slot />
      <AppButton
        variant="secondary"
        block
        type="button"
        @click="close"
      >
        Done
      </AppButton>
    </div>
  </dialog>
</template>
