<script setup lang="ts">
const props = defineProps<{
  title: string
  confirmLabel?: string
  danger?: boolean
  confirmText?: string
  phrase?: string
  secondPhrase?: string
  secondConfirmText?: string
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const typed = ref('')
const typedSecond = ref('')
const ready = computed(() => {
  if (props.phrase && typed.value.trim() !== props.phrase) {
    return false
  }
  if (props.secondPhrase && typedSecond.value.trim() !== props.secondPhrase) {
    return false
  }
  return true
})
</script>

<template>
  <div
    class="dialog-backdrop"
    role="presentation"
    @click.self="emit('cancel')"
  >
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'dialog-title'"
    >
      <h2 id="dialog-title">
        {{ title }}
      </h2>
      <slot />
      <label v-if="phrase">
        {{ confirmText || `Type ${phrase}` }}
        <input
          v-model="typed"
          type="text"
          autocomplete="off"
        >
      </label>
      <label v-if="secondPhrase">
        {{ secondConfirmText || `Type ${secondPhrase}` }}
        <input
          v-model="typedSecond"
          type="text"
          autocomplete="off"
        >
      </label>
      <div class="row">
        <button
          type="button"
          class="secondary"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          :class="{ danger }"
          :disabled="!ready"
          @click="emit('confirm')"
        >
          {{ confirmLabel || 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>
