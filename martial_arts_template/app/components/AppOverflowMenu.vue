<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function close() {
  emit('update:open', false)
}

watch(() => props.open, (value) => {
  if (!import.meta.client) {
    return
  }
  document.body.style.overflow = value ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50"
    >
      <div
        class="absolute inset-0 bg-navy-950/50"
        @click="close"
      />
      <div
        role="menu"
        class="absolute inset-x-0 bottom-0 max-h-[min(28rem,80vh)] overflow-y-auto rounded-t-lg border border-line bg-paper p-2 shadow-lg lg:inset-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-72 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lg"
        @keydown.escape="close"
      >
        <div class="flex items-center justify-between gap-2 px-2 py-2">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {{ title || 'More' }}
          </p>
          <button
            type="button"
            class="btn btn-ghost min-h-11 px-3 text-sm"
            @click="close"
          >
            Close
          </button>
        </div>
        <div
          class="flex flex-col gap-1 pb-2"
          @click="close"
        >
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
