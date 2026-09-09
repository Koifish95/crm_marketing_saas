<script setup lang="ts">
const props = defineProps<{
  tabs: { id: string, label: string }[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div
    class="tabs"
    role="tablist"
  >
    <button
      v-for="tab in props.tabs"
      :key="tab.id"
      type="button"
      class="secondary"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :class="{ active: modelValue === tab.id }"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
