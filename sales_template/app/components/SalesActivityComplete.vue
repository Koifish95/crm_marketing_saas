<script setup lang="ts">
import {
  ACTIVITY_OUTCOMES,
  ACTIVITY_TYPES,
  activityOutcomeLabel,
  activityOutcomeRequired,
  activityTypeLabel,
} from '#shared/utils/pipeline'

const props = defineProps<{
  activityType: string
}>()

const emit = defineEmits<{
  cancel: []
  complete: [payload: {
    outcome?: string
    notes: string
    next?: { type: string, description: string, dueAt: number }
  }]
}>()

function defaultOutcome(type: string) {
  if (type === 'meeting') {
    return 'meeting_held'
  }
  if (activityOutcomeRequired(type)) {
    return 'no_answer'
  }
  return ''
}

function localDateTime(ms: number) {
  const date = new Date(ms)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const outcome = ref(defaultOutcome(props.activityType))
const notes = ref('')
const scheduleNext = ref(true)
const nextType = ref(props.activityType || 'call')
const nextDescription = ref('')
const nextDue = ref(localDateTime(Date.now() + 86_400_000))
const saving = ref(false)

async function submit() {
  saving.value = true
  try {
    emit('complete', {
      outcome: outcome.value || undefined,
      notes: notes.value,
      next: scheduleNext.value
        ? {
            type: nextType.value,
            description: nextDescription.value || 'Follow-up',
            dueAt: nextDue.value ? new Date(nextDue.value).getTime() : Date.now() + 86_400_000,
          }
        : undefined,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form
    class="mt-3 space-y-3 rounded-md border border-navy-600/15 p-3"
    @submit.prevent="submit"
  >
    <AppField
      v-if="activityOutcomeRequired(activityType)"
      label="Outcome"
      required
    >
      <select
        v-model="outcome"
        class="control"
        required
      >
        <option
          v-for="code in ACTIVITY_OUTCOMES"
          :key="code"
          :value="code"
        >
          {{ activityOutcomeLabel(code) }}
        </option>
      </select>
    </AppField>
    <AppField
      v-else
      label="Outcome"
    >
      <select
        v-model="outcome"
        class="control"
      >
        <option value="">
          None
        </option>
        <option
          v-for="code in ACTIVITY_OUTCOMES"
          :key="code"
          :value="code"
        >
          {{ activityOutcomeLabel(code) }}
        </option>
      </select>
    </AppField>
    <AppField label="Notes">
      <textarea
        v-model="notes"
        class="control"
        rows="2"
      />
    </AppField>
    <label class="touch-row">
      <input
        v-model="scheduleNext"
        type="checkbox"
      >
      Schedule another activity
    </label>
    <div
      v-if="scheduleNext"
      class="grid gap-3 sm:grid-cols-2"
    >
      <AppField label="Next type">
        <select
          v-model="nextType"
          class="control"
        >
          <option
            v-for="code in ACTIVITY_TYPES"
            :key="code"
            :value="code"
          >
            {{ activityTypeLabel(code) }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Next due"
        required
      >
        <input
          v-model="nextDue"
          class="control"
          type="datetime-local"
          required
        >
      </AppField>
      <AppField
        class="sm:col-span-2"
        label="Next description"
      >
        <input
          v-model="nextDescription"
          class="control"
          placeholder="Follow-up call"
        >
      </AppField>
    </div>
    <div class="flex flex-wrap gap-2">
      <AppButton
        type="submit"
        :loading="saving"
      >
        Complete
      </AppButton>
      <AppButton
        type="button"
        variant="secondary"
        @click="emit('cancel')"
      >
        Cancel
      </AppButton>
    </div>
  </form>
</template>
