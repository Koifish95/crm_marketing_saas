<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { AcquisitionEventStatus, EventAttendance, LeadSource } from '#shared/schemas/enums'
import { campaignStaffPath } from '#shared/utils/campaign'
import { eventStaffPath } from '#shared/utils/event'
import { leadStaffPath } from '#shared/utils/lead'
import { contactMatchKindLabel, eventStatusLabel, eventStatusTone, personName } from '#shared/utils/labels'
import {
  datetimeLocalFromUnknown,
  datetimeLocalValueToIso,
  toBusinessDateTime,
} from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

const route = useRoute()
const eventId = computed(() => Number(route.params.id))

interface SessionRow {
  id: number
  name: string
  startsAt: string | Date
  endsAt: string | Date | null
  capacity: number | null
  programId: number | null
  minAge: number | null
  maxAge: number | null
  active: boolean
  program?: { id: number, name: string } | null
}

interface LineRow {
  id: number
  firstName: string
  lastName: string | null
  age: number | null
  attendance: EventAttendance
  sessionId: number
  leadLineId: number | null
  notes: string | null
  session?: { name: string } | null
}

interface DuplicateWarning {
  kind: 'EVENT_REGISTRATION' | 'CRM_HOUSEHOLD'
  matchKind: 'PHONE' | 'EMAIL' | 'BOTH'
  registrationId?: number
  leadId?: number
  label: string
}

interface RegistrationRow {
  id: number
  contactFirstName: string
  contactLastName: string | null
  phone: string | null
  email: string | null
  source: string | null
  notes: string | null
  excludeFromProcessing: boolean
  processedAt: string | Date | null
  leadId: number | null
  answers?: Array<{ questionId: number, value: string }>
  lines: LineRow[]
  duplicateWarnings?: DuplicateWarning[]
}

interface EventDetail {
  id: number
  title: string
  slug: string
  description: string | null
  status: AcquisitionEventStatus
  campaignId: number | null
  programId: number | null
  registrationOpensAt: string | Date | null
  registrationClosesAt: string | Date | null
  campaign?: { id: number, name: string } | null
  program?: { id: number, name: string } | null
  registrationManuallyClosed: boolean
  sessions: SessionRow[]
  questions: Array<{ id: number, prompt: string, fieldType: string }>
  registrations: RegistrationRow[]
}

interface PreviewMatch {
  id: number
  firstName: string
  lastName: string | null
  matchKind?: 'PHONE' | 'EMAIL' | 'BOTH'
}

interface PreviewRegistration {
  id: number
  contactName: string
  phone: string | null
  email: string | null
  processed: boolean
  leadId: number | null
  participants: Array<{ name: string, attendance: string, sessionName: string | null }>
  duplicateWarnings: DuplicateWarning[]
}

interface Preview {
  registrations: number
  newHouseholds: number
  existingMatches: number
  ambiguous: number
  excluded: number
  followUpTasksToCreate: number
  rows: Array<{
    key: string
    outcome: 'NEW' | 'MATCH' | 'AMBIGUOUS' | 'ALREADY_PROCESSED'
    registrationIds: number[]
    registrations: PreviewRegistration[]
    matches: PreviewMatch[]
    confirmedLeadId: number | null
    proposedAction: string
    forceNew: boolean
  }>
  excludedRows?: Array<PreviewRegistration & { reason: string }>
}

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_ACQUISITION_EVENTS')))
const canProcess = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('PROCESS_EVENT_REGISTRATIONS')))
const errorMessage = ref('')
const { data: event, refresh, error } = await useFetch<EventDetail>(() => `/api/marketing/events/${eventId.value}`)
const { data: summaries, pending: summariesPending } = await useFetch<Array<{ id: number, title: string, status: AcquisitionEventStatus }>>('/api/marketing/events')
const { data: programs } = await useFetch<Array<{ id: number, name: string }>>('/api/programs')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')

useHead({
  title: computed(() => event.value?.title || 'Acquisition Event'),
})

const copied = ref('')
const showWalkIn = ref(false)
const eventTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'roster', label: 'Roster' },
  { id: 'process', label: 'Process' },
]
const selectorItems = computed(() => (summaries.value ?? []).map(row => ({
  id: row.id,
  label: row.title,
  badge: eventStatusLabel(row.status),
  badgeTone: eventStatusTone(row.status),
})))

function eventRecordTo(id: number): RouteLocationRaw {
  return {
    path: eventStaffPath(id),
    query: route.query,
  }
}

const editEvent = reactive({
  title: '',
  description: '',
  campaignId: '' as string | number | null,
  programId: '' as string | number | null,
  registrationOpensAt: '',
  registrationClosesAt: '',
})

watch(event, (row) => {
  if (!row) {
    return
  }
  editEvent.title = row.title
  editEvent.description = row.description ?? ''
  editEvent.campaignId = row.campaignId ?? ''
  editEvent.programId = row.programId ?? ''
  editEvent.registrationOpensAt = datetimeLocalFromUnknown(row.registrationOpensAt)
  editEvent.registrationClosesAt = datetimeLocalFromUnknown(row.registrationClosesAt)
}, { immediate: true })

const sessionForm = reactive({
  name: '',
  startsAt: '',
  endsAt: '',
  capacity: '',
  programId: '' as string | number,
  minAge: '',
  maxAge: '',
})
const questionForm = reactive({
  prompt: '',
  fieldType: 'SHORT_TEXT' as 'SHORT_TEXT' | 'YES_NO' | 'SINGLE_CHOICE',
  options: '',
})
const staffForm = reactive({
  firstName: '',
  lastName: '',
  phone: '',
  source: 'WALK_IN' as LeadSource,
  participantFirstName: '',
  sessionId: '' as string | number,
})
const preview = ref<Preview | null>(null)
const processResult = ref<{ createdLeadIds: number[], followUpsCreated: number } | null>(null)
const confirmOpen = ref(false)
const confirmations = ref<Record<number, string>>({})
const forceNew = ref<Record<number, boolean>>({})
const includeCancelled = ref<Record<number, boolean>>({})
const rowFeedback = ref<Record<string, { saving: boolean, saved: boolean, error: string }>>({})
const rowFeedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()

function rowKey(kind: 'attendance' | 'exclude', id: number) {
  return `${kind}-${id}`
}

function rowState(kind: 'attendance' | 'exclude', id: number) {
  return rowFeedback.value[rowKey(kind, id)]
}

function attendanceLabel(attendance: EventAttendance) {
  if (attendance === 'ATTENDED') {
    return 'Attended'
  }
  if (attendance === 'NO_SHOW') {
    return 'No-show'
  }
  if (attendance === 'CANCELLED') {
    return 'Cancelled'
  }
  return 'Registered'
}

function markRowSaving(key: string) {
  const timer = rowFeedbackTimers.get(key)
  if (timer) {
    clearTimeout(timer)
    rowFeedbackTimers.delete(key)
  }
  rowFeedback.value = { ...rowFeedback.value, [key]: { saving: true, saved: false, error: '' } }
}

function markRowSaved(key: string) {
  rowFeedback.value = { ...rowFeedback.value, [key]: { saving: false, saved: true, error: '' } }
  const timer = setTimeout(() => {
    const current = rowFeedback.value[key]
    if (current?.saved && !current.saving) {
      rowFeedback.value = Object.fromEntries(
        Object.entries(rowFeedback.value).filter(([entryKey]) => entryKey !== key),
      )
    }
    rowFeedbackTimers.delete(key)
  }, 2000)
  rowFeedbackTimers.set(key, timer)
}

function markRowError(key: string, message: string) {
  rowFeedback.value = { ...rowFeedback.value, [key]: { saving: false, saved: false, error: message } }
}

onBeforeUnmount(() => {
  for (const timer of rowFeedbackTimers.values()) {
    clearTimeout(timer)
  }
})

function fieldToIso(value?: string | Date | null) {
  if (value == null || value === '') {
    return null
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return datetimeLocalValueToIso(value)
  }
  return datetimeLocalValueToIso(datetimeLocalFromUnknown(value))
}

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function publicPath() {
  return event.value ? `/events/${event.value.slug}` : ''
}

function publicUrl() {
  if (!import.meta.client) {
    return publicPath()
  }
  return `${window.location.origin}${publicPath()}`
}

function registrationWindow(row: EventDetail) {
  const opens = row.registrationOpensAt ? toBusinessDateTime(new Date(row.registrationOpensAt).getTime()) : 'now'
  const closes = row.registrationClosesAt ? toBusinessDateTime(new Date(row.registrationClosesAt).getTime()) : 'manual'
  return `Opens ${opens} → ${closes}${row.registrationManuallyClosed ? ' · closed' : ''}`
}

async function copyPublicUrl() {
  await navigator.clipboard.writeText(publicUrl())
  copied.value = 'Copied the public URL.'
}

async function addSession() {
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/events/${eventId.value}/sessions`, {
      method: 'POST',
      body: {
        name: sessionForm.name,
        startsAt: datetimeLocalValueToIso(sessionForm.startsAt),
        endsAt: datetimeLocalValueToIso(sessionForm.endsAt),
        capacity: sessionForm.capacity ? Number(sessionForm.capacity) : null,
        programId: sessionForm.programId ? Number(sessionForm.programId) : null,
        minAge: sessionForm.minAge ? Number(sessionForm.minAge) : null,
        maxAge: sessionForm.maxAge ? Number(sessionForm.maxAge) : null,
      },
    })
    sessionForm.name = ''
    sessionForm.startsAt = ''
    sessionForm.endsAt = ''
    sessionForm.capacity = ''
    sessionForm.programId = ''
    sessionForm.minAge = ''
    sessionForm.maxAge = ''
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not add that session.')
  }
}

async function addQuestion() {
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/events/${eventId.value}/questions`, {
      method: 'POST',
      body: {
        prompt: questionForm.prompt,
        fieldType: questionForm.fieldType,
        options: questionForm.fieldType === 'SINGLE_CHOICE'
          ? questionForm.options.split(',').map(item => item.trim()).filter(Boolean)
          : undefined,
      },
    })
    questionForm.prompt = ''
    questionForm.options = ''
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not add that question.')
  }
}

async function setStatus(status: AcquisitionEventStatus) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/events/${eventId.value}`, { method: 'PATCH', body: { status } })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not update that event.')
  }
}

async function toggleClosed() {
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/events/${eventId.value}`, {
      method: 'PATCH',
      body: { registrationManuallyClosed: !event.value?.registrationManuallyClosed },
    })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not update registration.')
  }
}

async function saveEvent() {
  if (!event.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/events/${eventId.value}`, {
      method: 'PATCH',
      body: {
        title: editEvent.title,
        description: editEvent.description || null,
        campaignId: editEvent.campaignId === '' ? null : Number(editEvent.campaignId),
        programId: editEvent.programId === '' ? null : Number(editEvent.programId),
        registrationOpensAt: datetimeLocalValueToIso(editEvent.registrationOpensAt),
        registrationClosesAt: datetimeLocalValueToIso(editEvent.registrationClosesAt),
      },
    })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that event.')
  }
}

async function saveSession(session: SessionRow) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/events/sessions/${session.id}`, {
      method: 'PATCH',
      body: {
        name: session.name,
        startsAt: fieldToIso(session.startsAt),
        endsAt: fieldToIso(session.endsAt),
        capacity: session.capacity,
        programId: session.programId,
        minAge: session.minAge,
        maxAge: session.maxAge,
        active: session.active,
      },
    })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that session.')
  }
}

async function staffRegister() {
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/events/${eventId.value}/registrations`, {
      method: 'POST',
      body: {
        firstName: staffForm.firstName,
        lastName: staffForm.lastName,
        phone: staffForm.phone,
        source: staffForm.source,
        participants: [{
          firstName: staffForm.participantFirstName || staffForm.firstName,
          lastName: staffForm.lastName,
          sessionId: Number(staffForm.sessionId),
        }],
      },
    })
    staffForm.firstName = ''
    staffForm.lastName = ''
    staffForm.phone = ''
    staffForm.participantFirstName = ''
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not add that registration.')
  }
}

async function setAttendance(lineId: number, attendance: EventAttendance) {
  const key = rowKey('attendance', lineId)
  markRowSaving(key)
  try {
    await $fetch(`/api/marketing/events/lines/${lineId}`, { method: 'PATCH', body: { attendance } })
    await refresh()
    markRowSaved(key)
  } catch (caught) {
    markRowError(key, apiError(caught, 'Could not update attendance.'))
  }
}

async function setExcluded(registrationId: number, excludeFromProcessing: boolean) {
  const key = rowKey('exclude', registrationId)
  markRowSaving(key)
  try {
    await $fetch(`/api/marketing/events/registrations/${registrationId}`, {
      method: 'PATCH',
      body: { excludeFromProcessing },
    })
    await refresh()
    markRowSaved(key)
  } catch (caught) {
    markRowError(key, apiError(caught, 'Could not update that registration.'))
  }
}

function processBody() {
  const forceNewIds = Object.entries(forceNew.value)
    .filter(([, enabled]) => enabled)
    .map(([registrationId]) => Number(registrationId))
  return {
    includeCancelledRegistrationIds: Object.entries(includeCancelled.value)
      .filter(([, include]) => include)
      .map(([registrationId]) => Number(registrationId)),
    forceNewRegistrationIds: forceNewIds,
    confirmations: Object.entries(confirmations.value)
      .filter(([registrationId, leadId]) => leadId && !forceNew.value[Number(registrationId)])
      .map(([registrationId, leadId]) => ({
        registrationId: Number(registrationId),
        leadId: Number(leadId),
      })),
  }
}

function outcomeLabel(outcome: string) {
  if (outcome === 'NEW') {
    return 'New household'
  }
  if (outcome === 'MATCH') {
    return 'Match existing'
  }
  if (outcome === 'AMBIGUOUS') {
    return 'Ambiguous match'
  }
  if (outcome === 'ALREADY_PROCESSED') {
    return 'Already processed'
  }
  return outcome
}

function outcomeTone(outcome: string) {
  if (outcome === 'NEW') {
    return 'brand' as const
  }
  if (outcome === 'MATCH' || outcome === 'ALREADY_PROCESSED') {
    return 'success' as const
  }
  if (outcome === 'AMBIGUOUS') {
    return 'warning' as const
  }
  return 'neutral' as const
}

function householdQuery() {
  return event.value?.campaignId ? { campaignId: String(event.value.campaignId) } : undefined
}

function warningText(warning: DuplicateWarning) {
  const via = contactMatchKindLabel(warning.matchKind)
  if (warning.kind === 'EVENT_REGISTRATION') {
    return `${via} matches another registration on this Event (${warning.label}).`
  }
  return `${via} matches ${warning.label} household.`
}

function setForceNew(registrationId: number, enabled: boolean) {
  forceNew.value = { ...forceNew.value, [registrationId]: enabled }
  if (enabled) {
    confirmations.value = { ...confirmations.value, [registrationId]: '' }
  }
  if (preview.value) {
    void loadPreview()
  }
}

async function loadPreview() {
  errorMessage.value = ''
  processResult.value = null
  try {
    preview.value = await $fetch<Preview>(`/api/marketing/events/${eventId.value}/process/preview`, {
      method: 'POST',
      body: processBody(),
    })
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not preview processing.')
  }
}

async function executeProcess() {
  errorMessage.value = ''
  confirmOpen.value = false
  try {
    const result = await $fetch<{ createdLeadIds: number[], followUpsCreated: number }>(
      `/api/marketing/events/${eventId.value}/process`,
      {
        method: 'POST',
        body: processBody(),
      },
    )
    processResult.value = result
    await refresh()
    preview.value = await $fetch<Preview>(`/api/marketing/events/${eventId.value}/process/preview`, {
      method: 'POST',
      body: processBody(),
    })
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not process registrations.')
  }
}
</script>

<template>
  <AppRecordWorkspace :loading="!event && !error">
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          to="/marketing/events"
          class="btn btn-secondary"
        >
          All events
        </NuxtLink>
      </div>
    </template>

    <AppAlert v-if="error">
      Could not load this event.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppAlert
      v-if="copied"
      tone="success"
    >
      {{ copied }}
    </AppAlert>

    <template #header>
      <AppRecordSelector
        :items="selectorItems"
        :current-id="eventId"
        :record-to="eventRecordTo"
        record-kind="Acquisition Event"
        :current-label="event?.title"
        :current-badge="event ? eventStatusLabel(event.status) : undefined"
        :current-badge-tone="event ? eventStatusTone(event.status) : undefined"
        :loading="summariesPending"
        search-placeholder="Search events"
        aria-label="Select event"
      >
        <template
          v-if="event"
          #meta
        >
          <span class="min-w-0 break-all">{{ publicUrl() }}</span>
          <span aria-hidden="true">·</span>
          <NuxtLink
            v-if="event.campaign"
            :to="campaignStaffPath(event.campaign.id)"
            class="font-medium text-brand-700 hover:text-brand-600"
          >
            {{ event.campaign.name }}
          </NuxtLink>
          <span v-else>No campaign</span>
          <span aria-hidden="true">·</span>
          <span>{{ registrationWindow(event) }}</span>
        </template>
      </AppRecordSelector>
    </template>
    <template
      v-if="event"
      #actions
    >
      <AppButton
        variant="subtle"
        @click="copyPublicUrl"
      >
        Copy public URL
      </AppButton>
      <AppButton
        v-if="canManage && event.status === 'DRAFT'"
        @click="setStatus('PUBLISHED')"
      >
        Publish
      </AppButton>
      <AppButton
        v-if="canManage && event.status === 'PUBLISHED'"
        variant="secondary"
        @click="setStatus('COMPLETED')"
      >
        Mark completed
      </AppButton>
      <AppButton
        v-if="canManage"
        variant="secondary"
        @click="toggleClosed"
      >
        {{ event.registrationManuallyClosed ? 'Reopen registration' : 'Close registration' }}
      </AppButton>
    </template>

    <AppEmpty
      v-if="!event && error"
      title="Event not found"
      description="That event is missing, or you do not have Marketing access."
    >
      <NuxtLink
        to="/marketing/events"
        class="btn btn-secondary"
      >
        Back to events
      </NuxtLink>
    </AppEmpty>

    <template #tabs>
      <template v-if="event">
        <AppRecordTabs
          v-slot="{ active }"
          :tabs="eventTabs"
        >
          <form
            v-if="active === 'overview' && canManage"
            class="form-measure"
            @submit.prevent="saveEvent"
          >
            <AppPanel
              title="Event details"
              description="Identity, program, and when registration is open. Status and public URL stay in the header."
            >
              <AppFieldGroup title="Identity">
                <AppField label="Title">
                  <input
                    v-model="editEvent.title"
                    class="control"
                  >
                </AppField>
                <AppField label="Campaign">
                  <select
                    v-model="editEvent.campaignId"
                    class="control"
                  >
                    <option value="">
                      None
                    </option>
                    <option
                      v-for="campaign in campaigns ?? []"
                      :key="campaign.id"
                      :value="campaign.id"
                    >
                      {{ campaign.name }}
                    </option>
                  </select>
                </AppField>
                <AppField label="Program">
                  <select
                    v-model="editEvent.programId"
                    class="control"
                  >
                    <option value="">
                      None
                    </option>
                    <option
                      v-for="program in programs ?? []"
                      :key="program.id"
                      :value="program.id"
                    >
                      {{ program.name }}
                    </option>
                  </select>
                </AppField>
              </AppFieldGroup>
              <AppFieldGroup title="Registration window">
                <AppField label="Registration opens">
                  <input
                    v-model="editEvent.registrationOpensAt"
                    type="datetime-local"
                    class="control"
                  >
                </AppField>
                <AppField label="Registration closes">
                  <input
                    v-model="editEvent.registrationClosesAt"
                    type="datetime-local"
                    class="control"
                  >
                </AppField>
              </AppFieldGroup>
              <AppFieldGroup title="Description">
                <AppField
                  class="sm:col-span-2"
                  label="Description"
                >
                  <textarea
                    v-model="editEvent.description"
                    class="control min-h-24"
                  />
                </AppField>
              </AppFieldGroup>
              <div class="mt-6 flex flex-wrap gap-2">
                <AppButton type="submit">
                  Save event
                </AppButton>
                <AppButton
                  v-if="event.status !== 'CANCELLED'"
                  variant="ghost"
                  type="button"
                  @click="setStatus('CANCELLED')"
                >
                  Cancel event
                </AppButton>
              </div>
            </AppPanel>
          </form>
          <form
            v-if="active === 'sessions' && canManage"
            class="form-measure"
            @submit.prevent="addSession"
          >
            <AppPanel
              title="Add session"
              description="A session is a date, time, and capacity people register for. Add at least one before publishing the public page."
            >
              <AppFieldGroup title="When">
                <AppField
                  label="Session name"
                  required
                >
                  <input
                    v-model="sessionForm.name"
                    class="control"
                    required
                  >
                </AppField>
                <AppField
                  label="Starts"
                  required
                >
                  <input
                    v-model="sessionForm.startsAt"
                    type="datetime-local"
                    class="control"
                    required
                  >
                </AppField>
                <AppField label="Ends">
                  <input
                    v-model="sessionForm.endsAt"
                    type="datetime-local"
                    class="control"
                  >
                </AppField>
                <AppField
                  label="Capacity"
                  hint="Blank is unlimited"
                >
                  <input
                    v-model="sessionForm.capacity"
                    type="number"
                    min="1"
                    class="control control-short"
                  >
                </AppField>
              </AppFieldGroup>
              <AppFieldGroup title="Eligibility">
                <AppField label="Program">
                  <select
                    v-model="sessionForm.programId"
                    class="control"
                  >
                    <option value="">
                      Use event program
                    </option>
                    <option
                      v-for="program in programs ?? []"
                      :key="program.id"
                      :value="program.id"
                    >
                      {{ program.name }}
                    </option>
                  </select>
                </AppField>
                <AppField label="Min age">
                  <input
                    v-model="sessionForm.minAge"
                    type="number"
                    min="0"
                    class="control control-short"
                  >
                </AppField>
                <AppField label="Max age">
                  <input
                    v-model="sessionForm.maxAge"
                    type="number"
                    min="0"
                    class="control control-short"
                  >
                </AppField>
              </AppFieldGroup>
              <div class="mt-6">
                <AppButton type="submit">
                  Add session
                </AppButton>
              </div>
            </AppPanel>
          </form>

          <form
            v-if="active === 'overview' && canManage"
            class="form-measure mt-5"
            @submit.prevent="addQuestion"
          >
            <AppPanel
              title="Custom question"
              description="Optional prompts collected on public and staff registration."
            >
              <AppFieldGroup title="Question">
                <AppField
                  class="sm:col-span-2"
                  label="Prompt"
                  required
                >
                  <input
                    v-model="questionForm.prompt"
                    class="control"
                    required
                  >
                </AppField>
                <AppField label="Type">
                  <select
                    v-model="questionForm.fieldType"
                    class="control"
                  >
                    <option value="SHORT_TEXT">
                      Short text
                    </option>
                    <option value="YES_NO">
                      Yes / no
                    </option>
                    <option value="SINGLE_CHOICE">
                      Single choice
                    </option>
                  </select>
                </AppField>
                <AppField
                  v-if="questionForm.fieldType === 'SINGLE_CHOICE'"
                  label="Choices"
                  hint="Comma-separated"
                >
                  <input
                    v-model="questionForm.options"
                    class="control"
                  >
                </AppField>
              </AppFieldGroup>
              <div class="mt-6">
                <AppButton type="submit">
                  Add question
                </AppButton>
              </div>
            </AppPanel>
          </form>

          <AppPanel
            v-if="active === 'sessions'"
            class="mt-5"
            title="Sessions"
            description="Each session is a class time parents pick on the public registration page. Publish requires at least one."
          >
            <AppEmpty
              v-if="!event.sessions.length"
              title="No sessions yet"
              description="Add the class time parents will pick on the public page."
            />
            <ul
              v-else
              class="record-list"
            >
              <li
                v-for="session in event.sessions"
                :key="session.id"
                class="record-item"
              >
                <div
                  v-if="canManage"
                  class="space-y-3"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <p class="record-item-title">
                      {{ session.name }}
                    </p>
                    <label class="touch-row">
                      <input
                        v-model="session.active"
                        type="checkbox"
                      >
                      Active
                    </label>
                  </div>
                  <AppFieldGroup title="When">
                    <AppField label="Name">
                      <input
                        v-model="session.name"
                        class="control"
                      >
                    </AppField>
                    <AppField label="Starts">
                      <input
                        :value="datetimeLocalFromUnknown(session.startsAt)"
                        type="datetime-local"
                        class="control"
                        @input="session.startsAt = ($event.target as HTMLInputElement).value"
                      >
                    </AppField>
                    <AppField label="Ends">
                      <input
                        :value="datetimeLocalFromUnknown(session.endsAt)"
                        type="datetime-local"
                        class="control"
                        @input="session.endsAt = ($event.target as HTMLInputElement).value"
                      >
                    </AppField>
                    <AppField label="Capacity">
                      <input
                        v-model.number="session.capacity"
                        type="number"
                        min="1"
                        class="control control-short"
                      >
                    </AppField>
                  </AppFieldGroup>
                  <AppFieldGroup title="Eligibility">
                    <AppField label="Program">
                      <select
                        v-model.number="session.programId"
                        class="control"
                      >
                        <option :value="null">
                          Use event program
                        </option>
                        <option
                          v-for="program in programs ?? []"
                          :key="program.id"
                          :value="program.id"
                        >
                          {{ program.name }}
                        </option>
                      </select>
                    </AppField>
                    <AppField label="Min age">
                      <input
                        v-model.number="session.minAge"
                        type="number"
                        min="0"
                        class="control control-short"
                      >
                    </AppField>
                    <AppField label="Max age">
                      <input
                        v-model.number="session.maxAge"
                        type="number"
                        min="0"
                        class="control control-short"
                      >
                    </AppField>
                  </AppFieldGroup>
                  <AppButton
                    variant="secondary"
                    @click="saveSession(session)"
                  >
                    Save session
                  </AppButton>
                </div>
                <template v-else>
                  <p class="record-item-title">
                    {{ session.name }}
                  </p>
                  <p class="record-item-meta">
                    {{ toBusinessDateTime(new Date(session.startsAt).getTime()) }}
                    <span v-if="session.capacity"> · cap {{ session.capacity }}</span>
                  </p>
                </template>
              </li>
            </ul>
          </AppPanel>

          <div
            v-if="active === 'roster' && canManage && event.sessions.length"
            class="form-measure"
          >
            <AppButton
              variant="secondary"
              type="button"
              @click="showWalkIn = !showWalkIn"
            >
              {{ showWalkIn ? 'Hide walk-in form' : 'Add walk-in' }}
            </AppButton>
            <form
              v-if="showWalkIn"
              class="mt-3"
              @submit.prevent="staffRegister"
            >
              <AppPanel
                title="Staff registration"
                description="Phone, walk-in, or referral. This stays on the roster until batch processing."
              >
                <AppFieldGroup title="Contact">
                  <AppField
                    label="First name"
                    required
                  >
                    <input
                      v-model="staffForm.firstName"
                      class="control"
                      required
                    >
                  </AppField>
                  <AppField label="Last name">
                    <input
                      v-model="staffForm.lastName"
                      class="control"
                    >
                  </AppField>
                  <AppField
                    label="Phone"
                    required
                  >
                    <input
                      v-model="staffForm.phone"
                      type="tel"
                      inputmode="tel"
                      autocomplete="tel"
                      class="control"
                      required
                    >
                  </AppField>
                  <AppField label="Source">
                    <select
                      v-model="staffForm.source"
                      class="control"
                    >
                      <option value="WALK_IN">
                        Walk-in
                      </option>
                      <option value="PHONE">
                        Phone
                      </option>
                      <option value="REFERRAL">
                        Referral
                      </option>
                      <option value="OTHER">
                        Other
                      </option>
                    </select>
                  </AppField>
                </AppFieldGroup>
                <AppFieldGroup title="Participant">
                  <AppField
                    label="Participant first name"
                    hint="Blank uses the contact name"
                  >
                    <input
                      v-model="staffForm.participantFirstName"
                      class="control"
                    >
                  </AppField>
                  <AppField
                    label="Session"
                    required
                  >
                    <select
                      v-model="staffForm.sessionId"
                      class="control"
                      required
                    >
                      <option value="">
                        Choose session
                      </option>
                      <option
                        v-for="session in event.sessions"
                        :key="session.id"
                        :value="session.id"
                      >
                        {{ session.name }}
                      </option>
                    </select>
                  </AppField>
                </AppFieldGroup>
                <div class="mt-6">
                  <AppButton type="submit">
                    Add to roster
                  </AppButton>
                </div>
              </AppPanel>
            </form>
          </div>

          <div
            v-if="active === 'roster'"
            class="mt-5 space-y-3"
          >
            <div>
              <h2 class="text-sm font-semibold text-navy-900">
                Roster
              </h2>
              <p class="mt-0.5 text-sm text-muted">
                Each registration is one household contact. Attendance is per participant.
              </p>
            </div>
            <AppEmpty
              v-if="!event.registrations.length"
              title="No registrations yet"
              description="Staff can add a walk-in above, or people can use the public event page."
            />
            <ul
              v-else
              class="record-list"
            >
              <li
                v-for="registration in event.registrations"
                :key="registration.id"
                class="record-item"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="record-item-title">
                      {{ registration.contactFirstName }} {{ registration.contactLastName }}
                    </p>
                    <p class="record-item-meta">
                      <a
                        v-if="registration.phone"
                        :href="`tel:${registration.phone}`"
                        class="font-medium text-navy-800 hover:text-brand-700"
                      >{{ registration.phone }}</a>
                      <span
                        v-if="registration.phone && registration.email"
                        aria-hidden="true"
                      > · </span>
                      <a
                        v-if="registration.email"
                        :href="`mailto:${registration.email}`"
                        class="font-medium text-navy-800 hover:text-brand-700"
                      >{{ registration.email }}</a>
                      <span v-if="!registration.phone && !registration.email">No contact</span>
                      <template v-if="registration.source">
                        <span aria-hidden="true"> · </span>
                        <span>{{ registration.source }}</span>
                      </template>
                      <template v-if="registration.notes">
                        <span aria-hidden="true"> · </span>
                        <span>{{ registration.notes }}</span>
                      </template>
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <AppBadge
                      v-if="registration.leadId || registration.processedAt"
                      tone="success"
                    >
                      Processed
                    </AppBadge>
                    <AppBadge
                      v-else
                      tone="neutral"
                    >
                      Not processed
                    </AppBadge>
                    <NuxtLink
                      v-if="registration.leadId"
                      :to="leadStaffPath(registration.leadId, householdQuery())"
                      class="text-sm font-medium text-brand-700 hover:text-brand-600"
                    >
                      Open household
                    </NuxtLink>
                  </div>
                </div>

                <ul class="mt-3 space-y-3">
                  <li
                    v-for="line in registration.lines"
                    :key="line.id"
                    class="rounded-md bg-canvas px-3 py-3"
                  >
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div class="min-w-0">
                        <p class="font-medium text-navy-900">
                          {{ line.firstName }} {{ line.lastName }}
                        </p>
                        <p class="record-item-meta">
                          {{ line.session?.name || 'No session' }}
                          <template v-if="line.notes">
                            <span aria-hidden="true"> · </span>
                            <span>{{ line.notes }}</span>
                          </template>
                          <template v-if="line.leadLineId">
                            <span aria-hidden="true"> · </span>
                            <span>Person linked</span>
                          </template>
                        </p>
                      </div>
                      <div class="min-w-0 sm:w-52">
                        <label class="block text-xs font-medium text-muted">
                          Attendance
                          <select
                            v-if="canManage"
                            class="control mt-1 w-full"
                            :value="line.attendance"
                            :disabled="rowState('attendance', line.id)?.saving"
                            :aria-label="`Attendance for ${line.firstName}`"
                            @change="setAttendance(line.id, (($event.target as HTMLSelectElement).value as EventAttendance))"
                          >
                            <option value="REGISTERED">
                              Registered
                            </option>
                            <option value="ATTENDED">
                              Attended
                            </option>
                            <option value="NO_SHOW">
                              No-show
                            </option>
                            <option value="CANCELLED">
                              Cancelled
                            </option>
                          </select>
                          <span
                            v-else
                            class="mt-1 block text-sm text-ink"
                          >{{ attendanceLabel(line.attendance) }}</span>
                        </label>
                        <p
                          v-if="rowState('attendance', line.id)?.saving"
                          class="mt-1 text-xs text-muted"
                          aria-live="polite"
                        >
                          Saving…
                        </p>
                        <p
                          v-else-if="rowState('attendance', line.id)?.saved"
                          class="mt-1 text-xs text-success-700"
                          aria-live="polite"
                        >
                          Saved
                        </p>
                        <p
                          v-else-if="rowState('attendance', line.id)?.error"
                          class="mt-1 text-xs text-danger-700"
                          role="alert"
                        >
                          {{ rowState('attendance', line.id)?.error }}
                        </p>
                      </div>
                    </div>
                    <label
                      v-if="canProcess && line.attendance === 'CANCELLED'"
                      class="touch-row mt-2"
                    >
                      <input
                        type="checkbox"
                        :checked="includeCancelled[registration.id]"
                        @change="includeCancelled[registration.id] = ($event.target as HTMLInputElement).checked"
                      >
                      Include cancelled in processing
                    </label>
                  </li>
                </ul>

                <div
                  v-if="registration.duplicateWarnings?.length"
                  class="mt-3 rounded-md border border-amber-200 bg-warning-50 px-3 py-2"
                >
                  <AppBadge tone="warning">
                    Possible duplicate
                  </AppBadge>
                  <p
                    v-for="(warning, warningIndex) in registration.duplicateWarnings"
                    :key="`${registration.id}-dupe-${warningIndex}`"
                    class="mt-1 text-sm text-warning-800"
                  >
                    {{ warningText(warning) }}
                    <NuxtLink
                      v-if="warning.leadId"
                      :to="leadStaffPath(warning.leadId, householdQuery())"
                      class="ml-1 font-medium text-brand-700 hover:text-brand-600"
                    >
                      Open household
                    </NuxtLink>
                  </p>
                </div>

                <ul
                  v-if="registration.answers?.length"
                  class="record-item-meta mt-3"
                >
                  <li
                    v-for="answer in registration.answers"
                    :key="`${registration.id}-${answer.questionId}`"
                  >
                    {{ event.questions.find(question => question.id === answer.questionId)?.prompt || `Question ${answer.questionId}` }}:
                    {{ answer.value }}
                  </li>
                </ul>

                <div
                  v-if="canManage"
                  class="record-item-actions"
                >
                  <label class="touch-row">
                    <input
                      type="checkbox"
                      :checked="registration.excludeFromProcessing"
                      :disabled="rowState('exclude', registration.id)?.saving"
                      @change="setExcluded(registration.id, ($event.target as HTMLInputElement).checked)"
                    >
                    Exclude from processing
                  </label>
                  <p
                    v-if="rowState('exclude', registration.id)?.saving"
                    class="text-xs text-muted"
                    aria-live="polite"
                  >
                    Saving…
                  </p>
                  <p
                    v-else-if="rowState('exclude', registration.id)?.saved"
                    class="text-xs text-success-700"
                    aria-live="polite"
                  >
                    Saved
                  </p>
                  <p
                    v-else-if="rowState('exclude', registration.id)?.error"
                    class="text-xs text-danger-700"
                    role="alert"
                  >
                    {{ rowState('exclude', registration.id)?.error }}
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <AppPanel
            v-if="active === 'process' && canProcess"
            title="Process into Leads"
            description="ATTENDED and NO-SHOW are included by default. Cancelled rows stay out unless you include them. Ambiguous phone/email matches need an explicit household choice. One Event Follow-Up call is created per household for this Event."
          >
            <p class="text-sm text-muted">
              Run Preview to see who will be created, matched, skipped, or already processed. Duplicate warnings are advisory — you can still match an existing household or create a new one.
            </p>
            <AppButton
              class="mt-3"
              variant="secondary"
              @click="loadPreview"
            >
              Preview
            </AppButton>
            <p
              v-if="!preview"
              class="mt-4 text-sm text-muted"
            >
              Preview first. This tab will list each household group in the batch — not only the counts.
            </p>
            <AppAlert
              v-if="processResult"
              class="mt-4"
              tone="success"
            >
              Processed.
              {{ processResult.createdLeadIds.length }} new household{{ processResult.createdLeadIds.length === 1 ? '' : 's' }}
              · {{ processResult.followUpsCreated }} Event Follow-Up call{{ processResult.followUpsCreated === 1 ? '' : 's' }}.
              <span
                v-for="leadId in processResult.createdLeadIds"
                :key="leadId"
                class="ml-2"
              >
                <NuxtLink
                  :to="leadStaffPath(leadId, householdQuery())"
                  class="font-medium text-brand-700 hover:text-brand-600"
                >
                  Open household {{ leadId }}
                </NuxtLink>
              </span>
            </AppAlert>
            <div
              v-if="preview"
              class="mt-4 space-y-4 text-sm"
            >
              <p class="rounded-md bg-canvas px-3 py-2 font-medium text-navy-900">
                {{ preview.registrations }} included · {{ preview.newHouseholds }} new households ·
                {{ preview.existingMatches }} existing matches · {{ preview.ambiguous }} ambiguous ·
                {{ preview.excluded }} excluded · {{ preview.followUpTasksToCreate }} Follow-up calls
              </p>
              <ul class="record-list">
                <li
                  v-for="row in preview.rows"
                  :key="row.key"
                  class="record-item"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <AppBadge :tone="outcomeTone(row.outcome)">
                      {{ outcomeLabel(row.outcome) }}
                    </AppBadge>
                    <p class="font-medium text-navy-900">
                      {{ row.proposedAction }}
                    </p>
                  </div>
                  <ul class="mt-3 space-y-2">
                    <li
                      v-for="registration in row.registrations"
                      :key="registration.id"
                    >
                      <p class="font-medium">
                        {{ registration.contactName }}
                        <span class="font-normal text-muted">
                          · {{ registration.phone || registration.email || 'No contact' }}
                        </span>
                      </p>
                      <p class="text-xs text-muted">
                        {{ registration.participants.map(person => `${person.name} (${person.attendance}${person.sessionName ? ` · ${person.sessionName}` : ''})`).join(', ') || 'No included participants' }}
                      </p>
                      <div
                        v-if="registration.duplicateWarnings.length"
                        class="mt-1"
                      >
                        <AppBadge tone="warning">
                          Possible duplicate
                        </AppBadge>
                        <p
                          v-for="(warning, warningIndex) in registration.duplicateWarnings"
                          :key="`${registration.id}-preview-dupe-${warningIndex}`"
                          class="text-xs text-warning-800"
                        >
                          {{ warningText(warning) }}
                          <NuxtLink
                            v-if="warning.leadId"
                            :to="leadStaffPath(warning.leadId, householdQuery())"
                            class="ml-1 font-medium text-brand-700 hover:text-brand-600"
                          >
                            Open household
                          </NuxtLink>
                        </p>
                      </div>
                    </li>
                  </ul>
                  <div
                    v-if="row.matches.length"
                    class="mt-3 space-y-1"
                  >
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                      Suspected CRM households
                    </p>
                    <p
                      v-for="match in row.matches"
                      :key="match.id"
                    >
                      <NuxtLink
                        :to="leadStaffPath(match.id, householdQuery())"
                        class="font-medium text-brand-700 hover:text-brand-600"
                      >
                        {{ personName(match) }}
                      </NuxtLink>
                      <span
                        v-if="match.matchKind"
                        class="text-muted"
                      >
                        · {{ contactMatchKindLabel(match.matchKind) }}
                      </span>
                      <span
                        v-if="row.confirmedLeadId === match.id && row.outcome !== 'NEW'"
                        class="text-muted"
                      >
                        · proposed match
                      </span>
                    </p>
                  </div>
                  <NuxtLink
                    v-if="row.confirmedLeadId && (row.outcome === 'MATCH' || row.outcome === 'ALREADY_PROCESSED')"
                    :to="leadStaffPath(row.confirmedLeadId, householdQuery())"
                    class="mt-2 inline-block font-medium text-brand-700 hover:text-brand-600"
                  >
                    Open proposed household
                  </NuxtLink>
                  <label
                    v-if="row.outcome === 'MATCH' || row.outcome === 'AMBIGUOUS'"
                    class="touch-row mt-3"
                  >
                    <input
                      type="checkbox"
                      :checked="forceNew[row.registrationIds[0]!]"
                      @change="setForceNew(row.registrationIds[0]!, ($event.target as HTMLInputElement).checked)"
                    >
                    <span>This is a different household — create new instead of matching.</span>
                  </label>
                  <div
                    v-if="row.outcome === 'AMBIGUOUS' && !forceNew[row.registrationIds[0]!]"
                    class="mt-3"
                  >
                    <p class="font-medium">
                      Choose household
                    </p>
                    <select
                      v-model="confirmations[row.registrationIds[0]!]"
                      class="control mt-1"
                    >
                      <option value="">
                        Select existing household
                      </option>
                      <option
                        v-for="match in row.matches"
                        :key="match.id"
                        :value="match.id"
                      >
                        {{ personName(match) }}
                      </option>
                    </select>
                  </div>
                </li>
              </ul>
              <div
                v-if="preview.excludedRows?.length"
                class="record-item rounded-lg border border-line"
              >
                <AppBadge tone="neutral">
                  Excluded
                </AppBadge>
                <ul class="mt-3 space-y-2">
                  <li
                    v-for="row in preview.excludedRows"
                    :key="row.id"
                  >
                    <p class="font-medium">
                      {{ row.contactName }}
                      <span class="font-normal text-muted">· {{ row.reason }}</span>
                    </p>
                  </li>
                </ul>
              </div>
              <AppButton @click="confirmOpen = true">
                Process registrations
              </AppButton>
            </div>
          </AppPanel>
        </AppRecordTabs>
      </template>
    </template>

    <AppConfirm
      :open="confirmOpen"
      title="Process these registrations into Leads?"
      description="This creates or matches households and one Event follow-up call per household. It does not create Trials. You can run it again; already processed rows stay linked."
      confirm-label="Process now"
      @update:open="confirmOpen = $event"
      @confirm="executeProcess"
    />
  </AppRecordWorkspace>
</template>
