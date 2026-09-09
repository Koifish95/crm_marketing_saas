<script setup lang="ts">
import { EXPERIENCE_LABELS } from '#shared/utils/labels'

export interface TrialPersonDraft {
  key: string
  relationship: 'SELF' | 'CHILD' | 'SPOUSE' | 'OTHER'
  firstName: string
  lastName: string
  age: string
  experienceLevel: string
  programCode: 'ADULT_BJJ' | 'KIDS_BJJ'
  slotId: string
  selectedDate: string
}

const props = defineProps<{
  modelValue: TrialPersonDraft
  title?: string
  showIdentity?: boolean
  identityLocked?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TrialPersonDraft]
}>()

let latest = props.modelValue
watch(() => props.modelValue, (value) => {
  latest = value
})

function patch(partial: Partial<TrialPersonDraft>) {
  latest = { ...latest, ...partial }
  emit('update:modelValue', latest)
}

const availabilityQuery = computed(() => ({
  program: props.modelValue.programCode,
  age: props.modelValue.programCode === 'KIDS_BJJ' && props.modelValue.age
    ? Number(props.modelValue.age)
    : undefined,
}))

const { data: slots, pending: slotsPending } = await useFetch('/api/public/availability', {
  query: availabilityQuery,
})

const availableDates = computed(() => {
  const dates: string[] = []
  for (const slot of slots.value ?? []) {
    if (!dates.includes(slot.date)) {
      dates.push(slot.date)
    }
  }
  return dates
})

const kidsHint = computed(() => {
  if (props.modelValue.programCode === 'KIDS_BJJ' && !props.modelValue.age) {
    return 'Enter age to see the right class days.'
  }
  return undefined
})
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="title"
      class="text-sm font-semibold text-navy-900"
    >
      {{ title }}
    </p>

    <div
      v-if="showIdentity"
      class="grid gap-4 sm:grid-cols-2"
    >
      <AppField
        label="First name"
        required
      >
        <input
          :value="modelValue.firstName"
          required
          class="control"
          :disabled="identityLocked"
          @input="patch({ firstName: ($event.target as HTMLInputElement).value })"
        >
      </AppField>
      <AppField label="Last name">
        <input
          :value="modelValue.lastName"
          class="control"
          :disabled="identityLocked"
          @input="patch({ lastName: ($event.target as HTMLInputElement).value })"
        >
      </AppField>
      <AppField
        v-if="modelValue.relationship !== 'SELF'"
        label="Relationship"
      >
        <select
          :value="modelValue.relationship"
          class="control"
          @change="patch({ relationship: ($event.target as HTMLSelectElement).value as TrialPersonDraft['relationship'] })"
        >
          <option value="CHILD">
            Child
          </option>
          <option value="SPOUSE">
            Spouse / partner
          </option>
          <option value="OTHER">
            Other family member
          </option>
        </select>
      </AppField>
    </div>

    <fieldset>
      <legend class="text-sm font-medium text-navy-900">
        Program
      </legend>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-md border px-3 py-3 text-sm font-medium"
          :class="modelValue.programCode === 'ADULT_BJJ' ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-paper text-navy-800'"
          :aria-pressed="modelValue.programCode === 'ADULT_BJJ'"
          @click="patch({ programCode: 'ADULT_BJJ', age: '', slotId: '', selectedDate: '' })"
        >
          Adult Jiu-Jitsu
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-3 text-sm font-medium"
          :class="modelValue.programCode === 'KIDS_BJJ' ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-paper text-navy-800'"
          :aria-pressed="modelValue.programCode === 'KIDS_BJJ'"
          @click="patch({ programCode: 'KIDS_BJJ', slotId: '', selectedDate: '' })"
        >
          Kids Jiu-Jitsu
        </button>
      </div>
    </fieldset>

    <AppField
      v-if="modelValue.programCode === 'ADULT_BJJ'"
      label="Experience"
    >
      <select
        :value="modelValue.experienceLevel"
        class="control"
        @change="patch({ experienceLevel: ($event.target as HTMLSelectElement).value })"
      >
        <option
          v-for="(label, value) in EXPERIENCE_LABELS"
          :key="value"
          :value="value"
        >
          {{ label }}
        </option>
      </select>
    </AppField>

    <AppField
      v-if="modelValue.programCode === 'KIDS_BJJ'"
      label="Age"
      required
    >
      <input
        :value="modelValue.age"
        type="number"
        min="4"
        max="16"
        required
        inputmode="numeric"
        class="control"
        @input="patch({ age: ($event.target as HTMLInputElement).value, slotId: '', selectedDate: '' })"
      >
    </AppField>

    <IntroSlotPicker
      :dates="availableDates"
      :slots="slots ?? []"
      :selected-date="modelValue.selectedDate"
      :selected-slot-id="modelValue.slotId"
      :pending="slotsPending"
      :hint="kidsHint"
      @update:selected-date="patch({ selectedDate: $event, slotId: '' })"
      @update:selected-slot-id="patch({ slotId: $event })"
    />
  </div>
</template>
