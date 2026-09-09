<script setup lang="ts">
import { WEEKDAYS } from '#shared/utils/intro'
import { clockToMinuteOfDay, formatMinuteOfDay, minuteOfDayToClock } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Intro schedule',
})

const { user } = useUserSession()
const canEdit = computed(() => user.value?.role === 'ADMIN')
const { data: programs } = await useFetch('/api/programs')
const { data: rules, refresh: refreshRules } = await useFetch('/api/intro-availability')
const { data: exceptions, refresh: refreshExceptions } = await useFetch('/api/intro-exceptions')

const errorMessage = ref('')
const editingId = ref<number | null>(null)
const form = reactive({
  programId: '',
  weekday: '1',
  startClock: '18:00',
  endClock: '',
  name: '',
  ageMin: '',
  ageMax: '',
  enabled: true,
})
const exceptionForm = reactive({
  onDate: '',
  kind: 'CLOSE_DATE',
  ruleId: '',
  programId: '',
  name: '',
  startClock: '10:00',
  note: '',
})
const removeExceptionId = ref<number | null>(null)

const introPrograms = computed(() =>
  (programs.value ?? []).filter(program => program.code === 'ADULT_BJJ' || program.code === 'KIDS_BJJ'),
)

function weekdayLabel(value: number) {
  return WEEKDAYS.find(item => item.value === value)?.label ?? String(value)
}

function programLabel(rule: { program?: { name?: string, code?: string } | null }) {
  return rule.program?.name || rule.program?.code || 'Class'
}

function exceptionKindLabel(kind: string) {
  if (kind === 'CLOSE_DATE') {
    return 'Closed all day'
  }
  if (kind === 'CLOSE_RULE') {
    return 'Class closed'
  }
  if (kind === 'OPEN_SLOT') {
    return 'Extra class'
  }
  return kind
}

const days = computed(() => {
  return WEEKDAYS.map((day) => {
    const rows = (rules.value ?? [])
      .filter(rule => rule.weekday === day.value)
      .slice()
      .sort((a, b) => a.startMinute - b.startMinute || a.name.localeCompare(b.name))
    return { ...day, rows }
  })
})

function resetClassForm() {
  editingId.value = null
  form.programId = introPrograms.value[0] ? String(introPrograms.value[0].id) : ''
  form.weekday = '1'
  form.startClock = '18:00'
  form.endClock = ''
  form.name = ''
  form.ageMin = ''
  form.ageMax = ''
  form.enabled = true
}

function editRule(rule: NonNullable<typeof rules.value>[number]) {
  editingId.value = rule.id
  form.programId = String(rule.programId)
  form.weekday = String(rule.weekday)
  form.startClock = minuteOfDayToClock(rule.startMinute)
  form.endClock = rule.endMinute != null ? minuteOfDayToClock(rule.endMinute) : ''
  form.name = rule.name
  form.ageMin = rule.ageMin != null ? String(rule.ageMin) : ''
  form.ageMax = rule.ageMax != null ? String(rule.ageMax) : ''
  form.enabled = rule.enabled
}

function classPayload() {
  const startMinute = clockToMinuteOfDay(form.startClock)
  if (startMinute == null) {
    throw new Error('Choose a start time.')
  }
  const endMinute = form.endClock ? clockToMinuteOfDay(form.endClock) ?? null : null
  return {
    programId: Number(form.programId),
    weekday: Number(form.weekday),
    startMinute,
    endMinute,
    name: form.name,
    ageMin: form.ageMin ? Number(form.ageMin) : null,
    ageMax: form.ageMax ? Number(form.ageMax) : null,
    enabled: form.enabled,
  }
}

async function saveClass() {
  errorMessage.value = ''
  try {
    const body = classPayload()
    if (editingId.value) {
      await $fetch(`/api/intro-availability/${editingId.value}`, { method: 'PATCH', body })
    } else {
      await $fetch('/api/intro-availability', { method: 'POST', body })
    }
    resetClassForm()
    await refreshRules()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not save the class.'
  }
}

async function toggleRule(id: number, enabled: boolean) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/intro-availability/${id}`, { method: 'PATCH', body: { enabled } })
    if (editingId.value === id) {
      form.enabled = enabled
    }
    await refreshRules()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not update the class.'
  }
}

async function addException() {
  errorMessage.value = ''
  try {
    await $fetch('/api/intro-exceptions', {
      method: 'POST',
      body: {
        onDate: exceptionForm.onDate,
        kind: exceptionForm.kind,
        ruleId: exceptionForm.ruleId ? Number(exceptionForm.ruleId) : null,
        programId: exceptionForm.programId ? Number(exceptionForm.programId) : null,
        name: exceptionForm.name || null,
        startMinute: exceptionForm.kind === 'OPEN_SLOT' ? clockToMinuteOfDay(exceptionForm.startClock) ?? null : null,
        note: exceptionForm.note || null,
      },
    })
    await refreshExceptions()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not save the exception.'
  }
}

async function removeException(id: number) {
  await $fetch(`/api/intro-exceptions/${id}`, { method: 'DELETE' })
  await refreshExceptions()
}

function closeRemoveException(open: boolean) {
  if (!open) {
    removeExceptionId.value = null
  }
}

function confirmRemoveException() {
  if (removeExceptionId.value) {
    removeException(removeExceptionId.value)
  }
}

watch(introPrograms, (rows) => {
  if (!form.programId && rows[0]) {
    form.programId = String(rows[0].id)
  }
}, { immediate: true })
</script>

<template>
  <section class="space-y-8">
    <AppPageHeader
      title="Intro schedule"
      description="Weekly classes that can take a first-time trial. Public booking uses this list for the next 14 days (America/Denver). Disable a class to hide it from the public form without deleting it."
    />

    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <div class="space-y-3">
      <div
        v-for="day in days"
        :key="day.value"
        class="panel p-5"
      >
        <h2 class="font-semibold text-navy-900">
          {{ day.label }}
        </h2>
        <p
          v-if="!day.rows.length"
          class="mt-2 text-sm text-muted"
        >
          No trial classes this day.
        </p>
        <ul
          v-else
          class="panel-list mt-3 divide-y divide-line text-sm"
        >
          <li
            v-for="rule in day.rows"
            :key="rule.id"
            class="flex flex-wrap items-center justify-between gap-2 py-2.5"
          >
            <div>
              <p :class="rule.enabled ? 'font-medium text-navy-900' : 'text-muted'">
                {{ formatMinuteOfDay(rule.startMinute) }}
                <span v-if="rule.endMinute">– {{ formatMinuteOfDay(rule.endMinute) }}</span>
                · {{ rule.name }}
              </p>
              <p class="text-muted">
                {{ programLabel(rule) }}
                <span v-if="rule.ageMin != null">· ages {{ rule.ageMin }}–{{ rule.ageMax }}</span>
                <AppBadge
                  v-if="!rule.enabled"
                  class="ml-1"
                  tone="warning"
                >
                  Not offered for intros
                </AppBadge>
              </p>
            </div>
            <div
              v-if="canEdit"
              class="flex gap-2"
            >
              <AppButton
                variant="subtle"
                @click="editRule(rule)"
              >
                Edit
              </AppButton>
              <AppButton
                variant="ghost"
                @click="toggleRule(rule.id, !rule.enabled)"
              >
                {{ rule.enabled ? 'Disable' : 'Enable' }}
              </AppButton>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <form
      v-if="canEdit"
      class="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
      @submit.prevent="saveClass"
    >
      <h2 class="sm:col-span-2 text-sm font-semibold text-navy-900">
        {{ editingId ? 'Edit class' : 'Add class' }}
      </h2>
      <AppField
        label="Program"
        required
      >
        <select
          v-model="form.programId"
          required
          class="control"
        >
          <option
            v-for="program in introPrograms"
            :key="program.id"
            :value="program.id"
          >
            {{ program.name }}
          </option>
        </select>
      </AppField>
      <AppField label="Day">
        <select
          v-model="form.weekday"
          class="control"
        >
          <option
            v-for="day in WEEKDAYS"
            :key="day.value"
            :value="day.value"
          >
            {{ day.label }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Starts"
        required
      >
        <input
          v-model="form.startClock"
          type="time"
          required
          class="control"
        >
      </AppField>
      <AppField
        label="Ends"
        hint="optional"
      >
        <input
          v-model="form.endClock"
          type="time"
          class="control"
        >
      </AppField>
      <AppField
        class="sm:col-span-2"
        label="Class name"
        required
      >
        <input
          v-model="form.name"
          required
          class="control"
        >
      </AppField>
      <AppField label="Youngest age (kids)">
        <input
          v-model="form.ageMin"
          type="number"
          min="0"
          max="120"
          class="control"
        >
      </AppField>
      <AppField label="Oldest age (kids)">
        <input
          v-model="form.ageMax"
          type="number"
          min="0"
          max="120"
          class="control"
        >
      </AppField>
      <label class="touch-row sm:col-span-2">
        <input
          v-model="form.enabled"
          type="checkbox"
        >
        Offer this class as a first-time intro
      </label>
      <div class="flex flex-wrap gap-2 sm:col-span-2">
        <AppButton type="submit">
          {{ editingId ? 'Save changes' : 'Add class' }}
        </AppButton>
        <AppButton
          v-if="editingId"
          variant="ghost"
          type="button"
          @click="resetClassForm"
        >
          Cancel edit
        </AppButton>
      </div>
    </form>

    <AppPanel
      title="Date exceptions"
      description="Close a day, close one class on a date, or add a one-off intro without changing the weekly schedule."
    >
      <ul
        v-if="exceptions?.length"
        class="panel-list space-y-2 text-sm"
      >
        <li
          v-for="item in exceptions"
          :key="item.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2"
        >
          <span>
            <span class="font-medium text-navy-900">{{ item.onDate }}</span>
            · {{ exceptionKindLabel(item.kind) }}
            <span v-if="item.name"> · {{ item.name }}</span>
            <span
              v-if="item.note"
              class="text-muted"
            > · {{ item.note }}</span>
          </span>
          <AppButton
            v-if="canEdit"
            variant="ghost"
            @click="removeExceptionId = item.id"
          >
            Remove
          </AppButton>
        </li>
      </ul>
      <p
        v-else
        class="text-sm text-muted"
      >
        No date exceptions.
      </p>
      <form
        v-if="canEdit"
        class="mt-4 grid gap-3 sm:grid-cols-2"
        @submit.prevent="addException"
      >
        <AppField label="Date">
          <input
            v-model="exceptionForm.onDate"
            type="date"
            required
            class="control"
          >
        </AppField>
        <AppField label="Type">
          <select
            v-model="exceptionForm.kind"
            class="control"
          >
            <option value="CLOSE_DATE">
              Close whole day
            </option>
            <option value="CLOSE_RULE">
              Close one class
            </option>
            <option value="OPEN_SLOT">
              Extra class this date
            </option>
          </select>
        </AppField>
        <AppField
          v-if="exceptionForm.kind === 'CLOSE_RULE'"
          class="sm:col-span-2"
          label="Class"
        >
          <select
            v-model="exceptionForm.ruleId"
            class="control"
          >
            <option value="">
              Class
            </option>
            <option
              v-for="rule in rules"
              :key="rule.id"
              :value="rule.id"
            >
              {{ weekdayLabel(rule.weekday) }} {{ formatMinuteOfDay(rule.startMinute) }} · {{ rule.name }}
            </option>
          </select>
        </AppField>
        <AppField
          v-if="exceptionForm.kind === 'OPEN_SLOT'"
          label="Program"
        >
          <select
            v-model="exceptionForm.programId"
            class="control"
          >
            <option value="">
              Program
            </option>
            <option
              v-for="program in introPrograms"
              :key="program.id"
              :value="program.id"
            >
              {{ program.name }}
            </option>
          </select>
        </AppField>
        <AppField
          v-if="exceptionForm.kind === 'OPEN_SLOT'"
          label="Class name"
        >
          <input
            v-model="exceptionForm.name"
            class="control"
          >
        </AppField>
        <AppField
          v-if="exceptionForm.kind === 'OPEN_SLOT'"
          label="Starts"
        >
          <input
            v-model="exceptionForm.startClock"
            type="time"
            required
            class="control"
          >
        </AppField>
        <AppField
          class="sm:col-span-2"
          label="Note"
        >
          <input
            v-model="exceptionForm.note"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton type="submit">
            Add exception
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppConfirm
      :open="removeExceptionId != null"
      title="Remove this exception?"
      description="The weekly schedule will apply again for that date."
      confirm-label="Remove exception"
      danger
      @update:open="closeRemoveException"
      @confirm="confirmRemoveException"
    />
  </section>
</template>
