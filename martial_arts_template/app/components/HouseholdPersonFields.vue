<script setup lang="ts">
import { EXPERIENCE_LABELS, LINE_RELATIONSHIP_LABELS } from '#shared/utils/labels'
import type { LeadLineRelationship } from '#shared/schemas/enums'

export interface HouseholdPersonDraft {
  key: string
  relationship: LeadLineRelationship
  firstName: string
  lastName: string
  age: string
  experienceLevel: string
  programId: string
}

const props = defineProps<{
  modelValue: HouseholdPersonDraft
  programs: Array<{ id: number, code: string, name: string }>
  selfTaken: boolean
  canRemove?: boolean
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: HouseholdPersonDraft]
  'remove': []
}>()

let latest = props.modelValue
watch(() => props.modelValue, (value) => {
  latest = value
})

function patch(partial: Partial<HouseholdPersonDraft>) {
  latest = { ...latest, ...partial }
  emit('update:modelValue', latest)
}

const selectedProgram = computed(() => props.programs.find(program => String(program.id) === String(props.modelValue.programId)))
const isKids = computed(() => selectedProgram.value?.code === 'KIDS_BJJ')
const isSelf = computed(() => props.modelValue.relationship === 'SELF')

function changeProgram(programId: string) {
  const kids = props.programs.find(program => String(program.id) === programId)?.code === 'KIDS_BJJ'
  patch({
    programId,
    age: kids ? latest.age : '',
    experienceLevel: kids ? 'UNKNOWN' : latest.experienceLevel,
  })
}
</script>

<template>
  <div class="space-y-4 rounded-md border border-line bg-canvas/60 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <p class="text-sm font-semibold text-navy-900">
        {{ isSelf ? 'Primary contact as a prospective member' : 'Prospective member' }}
      </p>
      <AppButton
        v-if="canRemove"
        variant="ghost"
        type="button"
        class="shrink-0"
        @click="emit('remove')"
      >
        Remove
      </AppButton>
    </div>

    <AppAlert
      v-if="error"
      class="text-sm"
    >
      {{ error }}
    </AppAlert>

    <div class="grid gap-4 sm:grid-cols-2">
      <AppField
        label="Relationship"
        required
      >
        <select
          :value="modelValue.relationship"
          class="control"
          :aria-label="`Relationship for this person`"
          @change="patch({ relationship: ($event.target as HTMLSelectElement).value as LeadLineRelationship })"
        >
          <option
            v-if="isSelf || !selfTaken"
            value="SELF"
          >
            {{ LINE_RELATIONSHIP_LABELS.SELF }}
          </option>
          <option value="CHILD">
            {{ LINE_RELATIONSHIP_LABELS.CHILD }}
          </option>
          <option value="SPOUSE">
            {{ LINE_RELATIONSHIP_LABELS.SPOUSE }}
          </option>
          <option value="OTHER">
            {{ LINE_RELATIONSHIP_LABELS.OTHER }}
          </option>
        </select>
      </AppField>
      <AppField
        v-if="isSelf"
        label="Name"
        hint="Uses the household contact name"
      >
        <p class="control bg-canvas text-muted">
          Same as household contact
        </p>
      </AppField>
      <template v-else>
        <AppField
          label="First name"
          required
        >
          <input
            :value="modelValue.firstName"
            required
            class="control"
            @input="patch({ firstName: ($event.target as HTMLInputElement).value })"
          >
        </AppField>
        <AppField label="Last name">
          <input
            :value="modelValue.lastName"
            class="control"
            @input="patch({ lastName: ($event.target as HTMLInputElement).value })"
          >
        </AppField>
      </template>
      <AppField
        class="sm:col-span-2"
        label="Program"
        required
      >
        <select
          :value="modelValue.programId"
          required
          class="control"
          @change="changeProgram(($event.target as HTMLSelectElement).value)"
        >
          <option
            disabled
            value=""
          >
            Select program
          </option>
          <option
            v-for="program in programs"
            :key="program.id"
            :value="String(program.id)"
          >
            {{ program.name }}
          </option>
        </select>
      </AppField>
      <AppField
        v-if="!isKids"
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
        v-if="isKids"
        label="Age"
        required
      >
        <input
          :value="modelValue.age"
          type="number"
          min="4"
          max="16"
          required
          class="control"
          @input="patch({ age: ($event.target as HTMLInputElement).value })"
        >
      </AppField>
    </div>
  </div>
</template>
