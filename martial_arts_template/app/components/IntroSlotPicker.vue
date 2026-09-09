<script setup lang="ts">
import { formatDenverChipDate, formatDenverLongDate, formatMinuteOfDay } from '#shared/utils/time'

export interface IntroSlotOption {
  id: string
  date: string
  name: string
  startMinute: number
  endMinute?: number | null
}

const props = defineProps<{
  dates: string[]
  slots: IntroSlotOption[]
  selectedDate: string
  selectedSlotId: string
  pending?: boolean
  emptyMessage?: string
  hint?: string
}>()

const emit = defineEmits<{
  'update:selectedDate': [value: string]
  'update:selectedSlotId': [value: string]
}>()

const slotsOnDate = computed(() => {
  if (!props.selectedDate) {
    return []
  }
  return props.slots.filter(slot => slot.date === props.selectedDate)
})

function chooseDate(date: string) {
  emit('update:selectedDate', date)
  emit('update:selectedSlotId', '')
}
</script>

<template>
  <div class="space-y-4">
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium text-navy-900">
        1. Choose a date
      </legend>
      <p
        v-if="hint"
        class="text-sm text-muted"
      >
        {{ hint }}
      </p>
      <p
        v-else-if="pending && !dates.length"
        class="text-sm text-muted"
      >
        Loading dates…
      </p>
      <p
        v-else-if="!dates.length"
        class="text-sm text-muted"
      >
        {{ emptyMessage || 'No upcoming intro dates for that selection.' }}
      </p>
      <div
        v-else
        class="grid grid-cols-2 gap-2"
      >
        <button
          v-for="date in dates"
          :key="date"
          type="button"
          class="min-h-11 rounded-md border px-2 py-2 text-left text-sm font-medium transition-colors"
          :class="selectedDate === date
            ? 'border-navy-900 bg-navy-900 text-white'
            : 'border-line bg-paper text-ink hover:border-navy-600/40'"
          :aria-pressed="selectedDate === date"
          @click="chooseDate(date)"
        >
          {{ formatDenverChipDate(date) }}
        </button>
      </div>
    </fieldset>

    <fieldset
      v-if="selectedDate"
      class="space-y-2"
    >
      <legend class="text-sm font-medium text-navy-900">
        2. Choose a class
      </legend>
      <p class="text-sm text-muted">
        {{ formatDenverLongDate(selectedDate) }}
      </p>
      <label
        v-for="slot in slotsOnDate"
        :key="slot.id"
        class="touch-row rounded-md border px-3 py-2.5 transition-colors"
        :class="selectedSlotId === slot.id
          ? 'border-navy-900 bg-navy-900/5'
          : 'border-line hover:border-navy-600/40'"
      >
        <input
          type="radio"
          class="mt-1"
          :value="slot.id"
          :checked="selectedSlotId === slot.id"
          @change="emit('update:selectedSlotId', slot.id)"
        >
        <span>
          <span class="font-medium text-navy-900">{{ formatMinuteOfDay(slot.startMinute) }}</span>
          <span
            v-if="slot.endMinute"
            class="text-muted"
          > – {{ formatMinuteOfDay(slot.endMinute) }}</span>
          <span class="block text-muted">{{ slot.name }}</span>
        </span>
      </label>
    </fieldset>
  </div>
</template>
