<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { FOLLOW_UP_CALL_OUTCOME_LABELS } from '#shared/utils/follow-up'
import {
  dueStateLabel,
  dueStateTone,
  followUpPurposeLabel,
  leadStatusLabel,
  personName,
  sourceLabel,
  householdDisplayStatus,
  statusHistoryNoteIsRedundant,
  taskStatusLabel,
  trialStatusLabel,
  trialStatusTone,
  contactMatchKindLabel,
} from '#shared/utils/labels'
import { centsToDollarString, dollarsToCents, ADULT_BJJ_DEFAULT_CENTS } from '#shared/utils/money'
import {
  activeConversion as findActiveConversion,
  activeLostOutcome,
  isTerminalLineStatus,
  nextScheduledTrial as earliestScheduledTrial,
  householdFollowUpMode,
  householdForecastMode,
  openForecastBreakdownRows,
  summarizeLeadLine,
  trialStatusCopy,
} from '#shared/utils/lead-line-summary'
import { denverYmd, formatDenverCardDate, formatDenverCardTime, formatDenverLongDate, toBusinessDateTime } from '#shared/utils/time'
import { campaignStaffPath } from '#shared/utils/campaign'
import { eventStaffPath } from '#shared/utils/event'
import { leadListQuery, leadStaffPath } from '#shared/utils/lead'
import { mergeRouteQuery } from '#shared/utils/record-workspace'
import type { FollowUpCallOutcome } from '#shared/schemas/enums'
import type { LeadRecord } from '#shared/types/crm'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'crm'],
})

const route = useRoute()
const { user } = useUserSession()
const canWrite = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'STAFF')
const canAdmin = computed(() => user.value?.role === 'ADMIN')
const id = computed(() => String(route.params.id))
const { data: me } = await useFetch<{ accessRights?: string[] }>('/api/auth/me')
const canManageCompensation = computed(() => canAdmin.value || Boolean(me.value?.accessRights?.includes('MANAGE_COMPENSATION_ATTRIBUTION')))
const canViewMarketing = computed(() => canAdmin.value || Boolean(me.value?.accessRights?.includes('VIEW_MARKETING')))

const { data: lead, error, refresh } = await useFetch<LeadRecord>(() => `/api/leads/${id.value}`)
const listQuery = computed(() => leadListQuery(route.query))
const { data: listRows, pending: listPending } = await useFetch<LeadRecord[]>('/api/leads', { query: listQuery })

useHead({
  title: computed(() => lead.value ? personName(lead.value) : 'Lead'),
})

const router = useRouter()
const leadTabs = [
  { id: 'members', label: 'Members' },
  { id: 'follow-up', label: 'Follow-up' },
  { id: 'attribution', label: 'Attribution' },
  { id: 'notes', label: 'Notes' },
]
const selectorItems = computed(() => (listRows.value ?? []).map(row => ({
  id: row.id,
  label: personName(row),
  badge: householdDisplayStatus(row).label,
  badgeTone: householdDisplayStatus(row).tone,
})))

function leadRecordTo(nextId: number): RouteLocationRaw {
  return {
    path: `/leads/${nextId}`,
    query: mergeRouteQuery(route.query, { line: '' }),
  }
}

function leadsIndexTo() {
  const query = leadListQuery(route.query)
  return Object.keys(query).length ? { path: '/leads', query } : '/leads'
}

const errorMessage = ref('')
const noteBody = ref('')
const statusTo = ref('')
const statusNote = ref('')
const monthlyRate = ref('175.00')
const selectedAddDate = ref('')
const selectedAddSlotId = ref('')
const selectedTrialLineId = ref('')
const newLine = reactive({
  firstName: '',
  lastName: '',
  relationship: 'CHILD',
  programId: '',
  age: '',
  notes: '',
  membershipOfferingId: '',
})
const hasSelfLine = computed(() => (lead.value?.lines ?? []).some(line => line.relationship === 'SELF'))
const duplicateWarnings = computed(() => {
  const persisted = (lead.value?.possibleDuplicateMatches ?? []).map(match => ({
    key: `persisted-${match.id}`,
    id: match.matchedLeadId,
    name: match.matchedDisplayName,
    matchKind: match.matchKind,
    detectedAt: match.detectedAt,
  }))
  const seen = new Set(persisted.map(item => item.id))
  const live = (lead.value?.duplicates ?? [])
    .filter(item => !seen.has(item.id))
    .map(item => ({
      key: `live-${item.id}`,
      id: item.id,
      name: personName(item),
      matchKind: item.matchKind,
      detectedAt: null as string | Date | null,
    }))
  return [...persisted, ...live]
})
watch(hasSelfLine, (hasSelf) => {
  if (hasSelf && newLine.relationship === 'SELF') {
    newLine.relationship = 'CHILD'
  }
})
const editingHousehold = ref(false)
const addingPerson = ref(false)
const expandedLineId = ref<number | null>(null)
const lineAction = ref<Record<number, 'convert' | 'lost' | 'schedule' | null>>({})
const lineNotes = ref<Record<number, string>>({})
const showCompletedFollowUp = ref(false)
const schedulingFollowUp = ref(false)
const showHouseholdNotes = ref(false)
const showStatusHistory = ref(false)
const showHouseholdWorkflow = ref(false)
const reschedulingTrialId = ref<number | null>(null)
const selectedRescheduleDate = ref('')
const selectedSlotId = ref('')
const completingTaskId = ref<number | null>(null)
const taskOutcome = ref<FollowUpCallOutcome>('REACHED')
const taskNote = ref('')
const taskAssignee = ref<Record<number, string>>({})
const manualDueAt = ref('')
const manualTaskNote = ref('')
const taskOutcomes = Object.entries(FOLLOW_UP_CALL_OUTCOME_LABELS) as Array<[FollowUpCallOutcome, string]>
const cancelTaskId = ref<number | null>(null)
const cancelTrialId = ref<number | null>(null)
const convertNote = ref<Record<number, string>>({})
const lostReasonId = ref<Record<number, string>>({})
const lostNote = ref<Record<number, string>>({})
const reverseNote = ref<Record<number, string>>({})
const reopenNote = ref<Record<number, string>>({})
const compensationOwner = ref<Record<number, string>>({})
const compensationEligibility = ref<Record<number, 'UNASSIGNED' | 'ELIGIBLE' | 'INELIGIBLE'>>({})
const compensationReason = ref<Record<number, string>>({})

const { data: staffUsers } = await useFetch<Array<{ id: number, displayName: string }>>('/api/users')
const { data: programs } = await useFetch('/api/programs')
const { data: offerings } = await useFetch<Array<{
  id: number
  name: string
  programId: number
  monthlyCents: number
  enrollmentCents: number
  active: boolean
}>>('/api/membership-offerings')
const { data: lostReasons } = await useFetch<Array<{ id: number, name: string }>>('/api/lost-reasons')
const { data: forecast, refresh: refreshForecast } = await useFetch<{
  monthlyCents: number
  enrollmentCents: number
  lines: Array<{
    leadLineId: number
    forecastMonthlyCents: number
    enrollmentCents: number
    overridden: boolean
    discountReason: string | null
    includedInForecast: boolean
  }>
}>(() => `/api/leads/${id.value}/forecast`)

interface LinePricingDraft {
  membershipOfferingId: string
  monthlyOverride: string
  discountReason: string
}

const linePricing = ref<Record<number, LinePricingDraft>>({})

watch(() => lead.value?.lines, (lines) => {
  const next: Record<number, LinePricingDraft> = {}
  const notes: Record<number, string> = {}
  const owners: Record<number, string> = {}
  const eligibility: Record<number, 'UNASSIGNED' | 'ELIGIBLE' | 'INELIGIBLE'> = {}
  const reasons: Record<number, string> = {}
  for (const line of lines ?? []) {
    next[line.id] = {
      membershipOfferingId: line.membershipOfferingId ? String(line.membershipOfferingId) : '',
      monthlyOverride: line.monthlyOverrideCents != null ? centsToDollarString(line.monthlyOverrideCents) : '',
      discountReason: line.discountReason ?? '',
    }
    notes[line.id] = line.notes ?? ''
    owners[line.id] = line.compensationAttribution?.creditedUserId != null ? String(line.compensationAttribution.creditedUserId) : ''
    eligibility[line.id] = (line.compensationAttribution?.eligibility as 'UNASSIGNED' | 'ELIGIBLE' | 'INELIGIBLE' | undefined) ?? 'UNASSIGNED'
    reasons[line.id] = ''
  }
  linePricing.value = next
  lineNotes.value = notes
  compensationOwner.value = owners
  compensationEligibility.value = eligibility
  compensationReason.value = reasons
}, { immediate: true })

const householdStatus = computed(() => lead.value ? householdDisplayStatus(lead.value) : null)
const isMultiLine = computed(() => (lead.value?.lines?.length ?? 0) > 1)
const workflowStatuses = computed(() => {
  const operational = ['NEW', 'CONTACTED', 'RESPONDED', 'TRIAL_SCHEDULED', 'TRIAL_ATTENDED', 'NO_SHOW']
  if (isMultiLine.value) {
    return operational
  }
  return [...operational, 'JOINED', 'LOST']
})
const pendingFollowUps = computed(() => (lead.value?.followUpTasks ?? []).filter(task => task.status === 'PENDING'))
const completedFollowUps = computed(() => (lead.value?.followUpTasks ?? []).filter(task => task.status !== 'PENDING'))
const followUpMode = computed(() => householdFollowUpMode(pendingFollowUps.value.length))
const forecastMode = computed(() => householdForecastMode(forecast.value?.monthlyCents ?? 0))
const openForecastBreakdown = computed(() => {
  return openForecastBreakdownRows(forecast.value?.lines ?? []).map(row => ({
    ...row,
    line: lead.value?.lines?.find(item => item.id === row.leadLineId) ?? null,
  }))
})

function offeringsForLine(programId: number, currentOfferingId?: number | null) {
  return (offerings.value ?? []).filter(offering =>
    offering.programId === programId && (offering.active || offering.id === currentOfferingId),
  )
}

function forecastForLine(lineId: number) {
  return forecast.value?.lines.find(row => row.leadLineId === lineId)
}

function createdDateLabel(value?: string | Date) {
  if (!value) {
    return '—'
  }
  return formatDenverLongDate(denverYmd(new Date(value).getTime()))
}

function nextTrialForLine(line: NonNullable<LeadRecord['lines']>[number]) {
  return earliestScheduledTrial(trialsForLine(line))
}

function summaryForLine(line: NonNullable<LeadRecord['lines']>[number]) {
  const forecastRow = forecastForLine(line.id)
  return summarizeLeadLine(line, forecastRow
    ? {
        leadLineId: line.id,
        forecastMonthlyCents: forecastRow.forecastMonthlyCents,
        enrollmentCents: forecastRow.enrollmentCents,
        overridden: forecastRow.overridden,
        includedInForecast: forecastRow.includedInForecast,
      }
    : null)
}

const lineSummaries = computed(() => {
  const rows: Record<number, ReturnType<typeof summarizeLeadLine>> = {}
  for (const line of lead.value?.lines ?? []) {
    rows[line.id] = summaryForLine(line)
  }
  return rows
})

function trialsForLine(line: NonNullable<LeadRecord['lines']>[number]) {
  const fromLine = line.trials ?? []
  if (fromLine.length) {
    return fromLine
  }
  return (lead.value?.trials ?? []).filter(trial => trial.leadLineId === line.id)
}

function isLineTerminal(line: { status: string }) {
  return isTerminalLineStatus(line.status)
}

function trialHasOccurred(trial: { scheduledAt: string | Date }) {
  return new Date(trial.scheduledAt).getTime() <= Date.now()
}

function historyTrialsForLine(line: NonNullable<LeadRecord['lines']>[number]) {
  return trialsForLine(line)
    .filter(trial => trial.status !== 'SCHEDULED')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
}

function toggleLine(lineId: number) {
  expandedLineId.value = expandedLineId.value === lineId ? null : lineId
  if (expandedLineId.value) {
    selectedTrialLineId.value = String(lineId)
    const line = lead.value?.lines?.find(item => item.id === lineId)
    if (line && !isLineTerminal(line) && !nextTrialForLine(line)) {
      lineAction.value = { ...lineAction.value, [lineId]: 'schedule' }
    }
  }
  void router.replace({
    query: mergeRouteQuery(route.query, {
      line: expandedLineId.value ? String(expandedLineId.value) : '',
    }),
  })
}

watch(
  () => route.query.line,
  (value) => {
    const lineId = Number(Array.isArray(value) ? value[0] : value)
    if (Number.isInteger(lineId) && lineId > 0) {
      expandedLineId.value = lineId
      selectedTrialLineId.value = String(lineId)
      return
    }
    expandedLineId.value = null
  },
  { immediate: true },
)

watch(id, () => {
  addingPerson.value = false
  editingHousehold.value = false
  showHouseholdWorkflow.value = false
})

function setExpandedLine(lineId: number) {
  expandedLineId.value = lineId
  selectedTrialLineId.value = String(lineId)
  void router.replace({
    query: mergeRouteQuery(route.query, { line: String(lineId) }),
  })
}

function startLineAction(lineId: number, action: 'convert' | 'lost' | 'schedule') {
  setExpandedLine(lineId)
  lineAction.value = { ...lineAction.value, [lineId]: action }
}

const lineMoreId = ref<number | null>(null)

function linePrimaryKind(line: NonNullable<LeadRecord['lines']>[number]) {
  const trial = nextTrialForLine(line)
  if (canWrite.value && trial?.canRecordTrialOutcome) {
    return 'attended' as const
  }
  if (canWrite.value && !isLineTerminal(line) && !trial) {
    return 'schedule' as const
  }
  return 'details' as const
}

function startAddingPerson() {
  addingPerson.value = !addingPerson.value
  if (!addingPerson.value) {
    return
  }
  if (lead.value && !hasSelfLine.value) {
    newLine.relationship = 'SELF'
    newLine.firstName = lead.value.firstName
    newLine.lastName = lead.value.lastName ?? ''
  } else {
    newLine.relationship = 'CHILD'
  }
  void router.replace({
    query: mergeRouteQuery(route.query, { tab: 'members' }),
  })
}

watch(() => newLine.relationship, (relationship) => {
  if (relationship !== 'SELF' || hasSelfLine.value || !lead.value) {
    return
  }
  if (!newLine.firstName.trim()) {
    newLine.firstName = lead.value.firstName
  }
  if (!newLine.lastName.trim()) {
    newLine.lastName = lead.value.lastName ?? ''
  }
})

const selectedLine = computed(() => {
  const lines = lead.value?.lines ?? []
  const selected = lines.find(line => String(line.id) === selectedTrialLineId.value)
  return selected ?? lines.find(line => line.relationship === 'CHILD') ?? lines[0] ?? null
})

const introProgramCode = computed(() => {
  const code = selectedLine.value?.program?.code ?? lead.value?.program?.code
  return code === 'ADULT_BJJ' || code === 'KIDS_BJJ' ? code : null
})

const introAvailabilityQuery = computed(() => ({
  program: introProgramCode.value === 'KIDS_BJJ' ? 'KIDS_BJJ' : 'ADULT_BJJ',
  age: introProgramCode.value === 'KIDS_BJJ' ? selectedLine.value?.age ?? lead.value?.participantAge ?? undefined : undefined,
}))

const { data: introSlots, pending: introSlotsPending, refresh: refreshIntroSlots } = await useFetch('/api/public/availability', {
  query: introAvailabilityQuery,
})

const rescheduleDates = computed(() => {
  const dates: string[] = []
  for (const slot of introSlots.value ?? []) {
    if (!dates.includes(slot.date)) {
      dates.push(slot.date)
    }
  }
  return dates
})

const slotHint = computed(() => {
  if (!introProgramCode.value) {
    return 'Intro class times are only listed for Adult BJJ and Kids BJJ.'
  }
  if (introProgramCode.value === 'KIDS_BJJ' && selectedLine.value?.age == null) {
    return 'Add the child’s age to see eligible class times.'
  }
  return undefined
})

watch([introProgramCode, () => lead.value?.participantAge], () => {
  selectedAddDate.value = ''
  selectedAddSlotId.value = ''
  selectedRescheduleDate.value = ''
  selectedSlotId.value = ''
  refreshIntroSlots()
})

watch(lead, (value) => {
  if (value) {
    statusTo.value = value.status
    if (!selectedTrialLineId.value && value.lines?.[0]) {
      const preferred = value.lines.find(line => line.relationship === 'CHILD') ?? value.lines[0]
      selectedTrialLineId.value = String(preferred.id)
    }
    if (value.monthlyRateCents != null) {
      monthlyRate.value = centsToDollarString(value.monthlyRateCents)
    } else if (value.program?.code === 'ADULT_BJJ') {
      monthlyRate.value = centsToDollarString(ADULT_BJJ_DEFAULT_CENTS)
    }
  }
}, { immediate: true })

async function saveContact() {
  if (!lead.value || !canWrite.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}`, {
      method: 'PATCH',
      body: {
        firstName: lead.value.firstName,
        lastName: lead.value.lastName,
        phone: lead.value.phone,
        email: lead.value.email,
        programId: lead.value.programId,
        experienceLevel: lead.value.experienceLevel,
        source: lead.value.source,
        participantFirstName: lead.value.participantFirstName,
        participantLastName: lead.value.participantLastName,
        participantAge: typeof lead.value.participantAge === 'number' && Number.isFinite(lead.value.participantAge)
          ? lead.value.participantAge
          : null,
        guardianRelationship: lead.value.guardianRelationship,
      },
    })
    editingHousehold.value = false
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Update failed.'
  }
}

async function changeStatus() {
  if (!lead.value) {
    return
  }
  errorMessage.value = ''
  try {
    const body: Record<string, unknown> = {
      toStatus: statusTo.value,
      note: statusNote.value || undefined,
    }
    if (statusTo.value === 'JOINED') {
      body.monthlyRateCents = dollarsToCents(monthlyRate.value)
    }
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/status`, { method: 'POST', body })
    statusNote.value = ''
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Status change failed.'
  }
}

async function addNote() {
  if (!lead.value || !noteBody.value.trim()) {
    return
  }
  await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/notes`, { method: 'POST', body: { body: noteBody.value } })
  noteBody.value = ''
  await refresh()
}

async function addTrial() {
  if (!lead.value || !selectedAddSlotId.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/trials`, {
      method: 'POST',
      body: {
        slotId: selectedAddSlotId.value,
        leadLineId: selectedTrialLineId.value ? Number(selectedTrialLineId.value) : undefined,
      },
    })
    selectedAddDate.value = ''
    selectedAddSlotId.value = ''
    if (selectedTrialLineId.value) {
      lineAction.value = { ...lineAction.value, [Number(selectedTrialLineId.value)]: null }
    }
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not schedule trial.'
  }
}

async function addHouseholdLine() {
  if (!lead.value || !newLine.firstName || !newLine.programId) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/lines`, {
      method: 'POST',
      body: {
        firstName: newLine.firstName,
        lastName: newLine.lastName || undefined,
        relationship: newLine.relationship,
        programId: Number(newLine.programId),
        age: newLine.age ? Number(newLine.age) : undefined,
        notes: newLine.notes || undefined,
        membershipOfferingId: newLine.membershipOfferingId ? Number(newLine.membershipOfferingId) : undefined,
      },
    })
    newLine.firstName = ''
    newLine.lastName = ''
    newLine.age = ''
    newLine.notes = ''
    newLine.membershipOfferingId = ''
    addingPerson.value = false
    await refresh()
    await refreshForecast()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not add that person.'
  }
}

async function saveLinePricing(lineId: number) {
  if (!lead.value) {
    return
  }
  const draft = linePricing.value[lineId]
  if (!draft) {
    return
  }
  errorMessage.value = ''
  try {
    let monthlyOverrideCents: number | null = null
    if (draft.monthlyOverride.trim()) {
      monthlyOverrideCents = dollarsToCents(draft.monthlyOverride.trim())
    }
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/lines/${lineId}`, {
      method: 'PATCH',
      body: {
        membershipOfferingId: draft.membershipOfferingId ? Number(draft.membershipOfferingId) : null,
        monthlyOverrideCents,
        discountReason: draft.discountReason.trim() || null,
      },
    })
    await refresh()
    await refreshForecast()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not save pricing.'
  }
}

function activeConversion(line: NonNullable<LeadRecord['lines']>[number]) {
  return findActiveConversion(line.conversions)
}

function latestLost(line: NonNullable<LeadRecord['lines']>[number]) {
  return activeLostOutcome(line.lostOutcomes)
}

async function saveLineNotes(lineId: number) {
  if (!lead.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/lines/${lineId}`, {
      method: 'PATCH',
      body: { notes: lineNotes.value[lineId] || null },
    })
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not save that note.'
  }
}

async function saveCompensation(lineId: number) {
  if (!lead.value) {
    return
  }
  const reason = compensationReason.value[lineId]?.trim() || ''
  if (reason.length < 3) {
    errorMessage.value = 'Explain this assignment in a few words.'
    return
  }
  errorMessage.value = ''
  const creditedUserId = compensationOwner.value[lineId] ? Number(compensationOwner.value[lineId]) : null
  try {
    await $fetch(`/api/marketing/compensation/${lineId}`, {
      method: 'POST',
      body: {
        creditedUserId,
        eligibility: compensationEligibility.value[lineId],
        reason,
      },
    })
    compensationReason.value[lineId] = ''
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not update compensation attribution.'
  }
}

async function convertLine(lineId: number) {
  if (!lead.value) {
    return
  }
  const persisted = lead.value.lines?.find(line => line.id === lineId)?.membershipOfferingId
  const selected = linePricing.value[lineId]?.membershipOfferingId
  const membershipOfferingId = selected ? Number(selected) : persisted ?? undefined
  if (!membershipOfferingId) {
    errorMessage.value = 'Select an offering before converting this person.'
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/lines/${lineId}/convert`, {
      method: 'POST',
      body: {
        note: convertNote.value[lineId] || undefined,
        membershipOfferingId,
      },
    })
    convertNote.value[lineId] = ''
    lineAction.value = { ...lineAction.value, [lineId]: null }
    await refresh()
    await refreshForecast()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not convert that person.'
  }
}

async function markLineLost(lineId: number) {
  if (!lead.value || !lostReasonId.value[lineId]) {
    errorMessage.value = 'A lost reason is required.'
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/lines/${lineId}/lost`, {
      method: 'POST',
      body: {
        lostReasonId: Number(lostReasonId.value[lineId]),
        note: lostNote.value[lineId] || undefined,
      },
    })
    lostNote.value[lineId] = ''
    lineAction.value = { ...lineAction.value, [lineId]: null }
    await refresh()
    await refreshForecast()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not mark that person lost.'
  }
}

async function reverseLineConversion(conversionId: number) {
  if (!lead.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/conversions/${conversionId}/reverse`, {
      method: 'POST',
      body: { note: reverseNote.value[conversionId] || 'Reversed conversion.' },
    })
    reverseNote.value[conversionId] = ''
    await refresh()
    await refreshForecast()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not reverse that conversion.'
  }
}

async function reopenLine(lineId: number) {
  if (!lead.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/leads/${lead.value.id}/lines/${lineId}/status`, {
      method: 'POST',
      body: {
        toStatus: 'CONTACTED',
        note: reopenNote.value[lineId] || 'Reopened.',
      },
    })
    reopenNote.value[lineId] = ''
    await refresh()
    await refreshForecast()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not reopen that person.'
  }
}

async function setOutcome(trialId: number, status: 'ATTENDED' | 'NO_SHOW' | 'CANCELLED') {
  await $fetch<LeadRecord>(`/api/trials/${trialId}/outcome`, { method: 'POST', body: { status } })
  await refresh()
}

async function startReschedule(trialId: number) {
  reschedulingTrialId.value = trialId
  selectedRescheduleDate.value = ''
  selectedSlotId.value = ''
}

async function reschedule(trialId: number) {
  if (!selectedSlotId.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch<LeadRecord>(`/api/trials/${trialId}/reschedule`, {
      method: 'POST',
      body: { slotId: selectedSlotId.value },
    })
    reschedulingTrialId.value = null
    selectedRescheduleDate.value = ''
    selectedSlotId.value = ''
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not reschedule that intro.'
  }
}

async function patchFollowUp(taskId: number, body: Record<string, unknown>) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/follow-up-tasks/${taskId}`, { method: 'PATCH', body })
    completingTaskId.value = null
    taskNote.value = ''
    taskOutcome.value = 'REACHED'
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not update that follow-up.'
  }
}

async function assignFollowUp(taskId: number) {
  const raw = taskAssignee.value[taskId]
  const assignedUserId = raw === '' || raw == null ? null : Number(raw)
  await patchFollowUp(taskId, { action: 'assign', assignedUserId })
}

async function addManualFollowUp() {
  if (!lead.value || !manualDueAt.value) {
    return
  }
  errorMessage.value = ''
  try {
    await $fetch('/api/follow-up-tasks', {
      method: 'POST',
      body: {
        leadId: lead.value.id,
        dueAt: new Date(manualDueAt.value).toISOString(),
        notes: manualTaskNote.value || undefined,
      },
    })
    manualDueAt.value = ''
    manualTaskNote.value = ''
    schedulingFollowUp.value = false
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not add that follow-up call.'
  }
}

function confirmCancelTask() {
  if (cancelTaskId.value) {
    patchFollowUp(cancelTaskId.value, { action: 'cancel' })
  }
}

function confirmCancelTrial() {
  if (cancelTrialId.value) {
    setOutcome(cancelTrialId.value, 'CANCELLED')
  }
}

function closeTrialConfirm(open: boolean) {
  if (!open) {
    cancelTrialId.value = null
  }
}

function closeTaskConfirm(open: boolean) {
  if (!open) {
    cancelTaskId.value = null
  }
}
</script>

<template>
  <AppRecordWorkspace>
    <template #toolbar>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          :to="leadsIndexTo()"
          class="btn btn-secondary"
        >
          All leads
        </NuxtLink>
        <NuxtLink
          v-if="canWrite"
          to="/leads/new"
          class="btn btn-primary"
        >
          Add household
        </NuxtLink>
      </div>
    </template>

    <section
      v-if="error"
      class="space-y-3"
    >
      <AppAlert>Lead not found.</AppAlert>
    </section>

    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppAlert
      v-if="duplicateWarnings.length"
      tone="warning"
    >
      <span class="font-semibold">Possible duplicate.</span>
      Matching contact information does not merge households.
      <span
        v-for="item in duplicateWarnings"
        :key="item.key"
        class="mt-1 block"
      >
        {{ contactMatchKindLabel(item.matchKind) }} match with
        <NuxtLink
          :to="leadStaffPath(item.id, route.query)"
          class="font-medium underline"
        >
          {{ item.name }}
        </NuxtLink>
        <template v-if="item.detectedAt">
          · detected {{ toBusinessDateTime(new Date(item.detectedAt).getTime()) }}
        </template>
      </span>
    </AppAlert>

    <template #header>
      <AppRecordSelector
        :items="selectorItems"
        :current-id="Number(id)"
        :record-to="leadRecordTo"
        record-kind="Household"
        :current-label="lead ? `${personName(lead)} household` : undefined"
        :current-badge="householdStatus?.label"
        :current-badge-tone="householdStatus?.tone"
        :loading="listPending"
        search-placeholder="Search this lead list"
        aria-label="Select household"
      >
        <template
          v-if="lead"
          #meta
        >
          <AppBadge
            v-if="duplicateWarnings.length"
            tone="warning"
          >
            Possible duplicate
          </AppBadge>
          <a
            v-if="lead.phone"
            :href="`tel:${lead.phone}`"
            class="font-medium text-navy-800 hover:text-brand-700"
          >{{ lead.phone }}</a>
          <template v-if="lead.phone && lead.email">
            <span aria-hidden="true">·</span>
          </template>
          <a
            v-if="lead.email"
            :href="`mailto:${lead.email}`"
            class="hover:text-brand-700"
          >{{ lead.email }}</a>
          <span aria-hidden="true">·</span>
          <span>{{ sourceLabel(lead.source) }}</span>
          <template v-if="lead.campaign?.name">
            <span aria-hidden="true">·</span>
            <span>
              <NuxtLink
                v-if="canViewMarketing && lead.campaign.id"
                :to="campaignStaffPath(lead.campaign.id)"
                class="font-medium text-brand-700 hover:text-brand-600"
              >
                {{ lead.campaign.name }}
              </NuxtLink>
              <template v-else>
                {{ lead.campaign.name }}
              </template>
              <span
                v-if="lead.trackingLink?.label"
                class="text-muted"
              >
                · {{ lead.trackingLink.label }}
              </span>
            </span>
          </template>
          <span
            v-for="item in lead.acquisitionEvents ?? []"
            :key="item.id"
          >
            <span aria-hidden="true">·</span>
            <NuxtLink
              v-if="canViewMarketing"
              :to="eventStaffPath(item.id)"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              {{ item.title }}
            </NuxtLink>
            <template v-else>
              {{ item.title }}
            </template>
            <span
              v-if="item.sessions.length"
              class="text-muted"
            >
              · {{ item.sessions.map(session => session.name).join(', ') }}
            </span>
          </span>
          <template v-if="lead.utmSource || lead.utmMedium || lead.utmContent">
            <span
              class="hidden lg:inline"
              aria-hidden="true"
            >·</span>
            <span class="hidden lg:inline">{{ [lead.utmSource, lead.utmMedium, lead.utmContent].filter(Boolean).join(' · ') }}</span>
          </template>
          <template v-if="lead.createdAt">
            <span
              class="hidden lg:inline"
              aria-hidden="true"
            >·</span>
            <span class="hidden lg:inline">Created {{ createdDateLabel(lead.createdAt) }}</span>
          </template>
        </template>
      </AppRecordSelector>

      <form
        v-if="lead && editingHousehold"
        class="mt-4 grid gap-3 rounded-md bg-canvas p-4 sm:grid-cols-2"
        @submit.prevent="saveContact"
      >
        <AppField label="First name">
          <input
            v-model="lead.firstName"
            class="control"
          >
        </AppField>
        <AppField label="Last name">
          <input
            v-model="lead.lastName"
            class="control"
          >
        </AppField>
        <AppField label="Phone">
          <input
            v-model="lead.phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            class="control"
          >
        </AppField>
        <AppField label="Email">
          <input
            v-model="lead.email"
            type="email"
            autocomplete="email"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton type="submit">
            Save household
          </AppButton>
        </div>
      </form>

      <div
        v-if="lead && showHouseholdWorkflow"
        class="mt-4 space-y-3 rounded-md border border-line p-4"
      >
        <p class="text-sm text-muted">
          Household status is derived from each prospective member.
          Convert or mark lost on the person, not the whole household.
          <span v-if="isMultiLine">Joined and Lost are not available here when more than one person is on this household.</span>
        </p>
        <select
          v-model="statusTo"
          class="control"
          :disabled="!canWrite"
        >
          <option
            v-for="item in workflowStatuses"
            :key="item"
            :value="item"
          >
            {{ leadStatusLabel(item) }}
          </option>
        </select>
        <textarea
          v-model="statusNote"
          class="control"
          rows="2"
          placeholder="Note required for backward/corrective changes"
          :disabled="!canWrite"
        />
        <AppField
          v-if="statusTo === 'JOINED'"
          label="Monthly rate (USD)"
        >
          <input
            v-model="monthlyRate"
            class="control"
            :disabled="!canWrite"
          >
        </AppField>
        <AppButton
          v-if="canWrite"
          type="button"
          @click="changeStatus"
        >
          Update household workflow
        </AppButton>
      </div>
    </template>
    <template
      v-if="lead"
      #actions
    >
      <AppButton
        v-if="canWrite"
        variant="secondary"
        @click="editingHousehold = !editingHousehold"
      >
        {{ editingHousehold ? 'Close household edit' : 'Edit household' }}
      </AppButton>
      <AppButton
        v-if="canWrite"
        @click="startAddingPerson"
      >
        Add person
      </AppButton>
      <AppButton
        v-if="canWrite"
        variant="subtle"
        @click="showHouseholdWorkflow = !showHouseholdWorkflow"
      >
        Household workflow
      </AppButton>
    </template>

    <template
      v-if="lead"
      #tabs
    >
      <AppRecordTabs
        v-slot="{ active }"
        :tabs="leadTabs"
      >
        <AppPanel
          v-if="active === 'members'"
          title="Prospective members"
          description="Each person’s program, latest intro, and outcome. Open details for history and actions."
        >
          <ul class="record-list">
            <li
              v-for="line in lead.lines ?? []"
              :key="line.id"
              class="record-item"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <h3 class="record-item-title font-display text-lg font-semibold tracking-tight">
                    {{ personName(line) }}
                  </h3>
                  <p class="record-item-meta">
                    {{ lineSummaries[line.id]?.relationshipLabel }}
                    <template v-if="lineSummaries[line.id]?.age != null">
                      · Age {{ lineSummaries[line.id]?.age }}
                    </template>
                    <template v-if="lineSummaries[line.id]?.programName">
                      · {{ lineSummaries[line.id]?.programName }}
                    </template>
                  </p>
                </div>
                <AppBadge
                  class="shrink-0"
                  :tone="lineSummaries[line.id]?.statusTone"
                >
                  {{ lineSummaries[line.id]?.statusLabel }}
                </AppBadge>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                    Latest Trial
                  </p>
                  <template v-if="lineSummaries[line.id]!.latestTrial">
                    <p class="mt-1 break-words font-medium text-navy-900">
                      {{ formatDenverCardDate(new Date(lineSummaries[line.id]!.latestTrial!.scheduledAt).getTime()) }}
                      · {{ formatDenverCardTime(new Date(lineSummaries[line.id]!.latestTrial!.scheduledAt).getTime()) }}
                    </p>
                    <p
                      v-if="lineSummaries[line.id]!.latestTrial?.label"
                      class="break-words text-sm text-muted"
                    >
                      {{ lineSummaries[line.id]!.latestTrial?.label }}
                    </p>
                    <AppBadge
                      class="mt-2"
                      :tone="trialStatusCopy(lineSummaries[line.id]!.latestTrial)!.tone"
                    >
                      {{ trialStatusCopy(lineSummaries[line.id]!.latestTrial)!.label }}
                    </AppBadge>
                  </template>
                  <p
                    v-else
                    class="mt-1 text-sm text-muted"
                  >
                    No intro scheduled.
                  </p>
                </div>

                <div
                  v-if="lineSummaries[line.id]!.kind === 'joined' && lineSummaries[line.id]!.conversion"
                  class="min-w-0"
                >
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                    Outcome
                  </p>
                  <p class="mt-1 font-medium text-navy-900">
                    Joined {{ formatDenverCardDate(new Date(lineSummaries[line.id]!.conversion!.joinedAt).getTime()) }}
                  </p>
                  <p class="mt-1 break-words text-sm text-navy-800">
                    {{ lineSummaries[line.id]!.conversion?.offeringName || lineSummaries[line.id]!.offeringName || 'Membership' }}
                    · ${{ centsToDollarString(lineSummaries[line.id]!.conversion!.monthlyCents) }}/month
                  </p>
                  <p
                    v-if="lineSummaries[line.id]!.conversion!.enrollmentCents > 0"
                    class="text-sm text-muted"
                  >
                    Enrollment ${{ centsToDollarString(lineSummaries[line.id]!.conversion!.enrollmentCents) }}
                  </p>
                </div>

                <div
                  v-else-if="lineSummaries[line.id]!.kind === 'lost'"
                  class="min-w-0"
                >
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                    Outcome
                  </p>
                  <p class="mt-1 font-medium text-navy-900">
                    Lost
                    <template v-if="lineSummaries[line.id]!.lost">
                      {{ formatDenverCardDate(new Date(lineSummaries[line.id]!.lost!.createdAt).getTime()) }}
                    </template>
                  </p>
                  <p
                    v-if="lineSummaries[line.id]!.lost?.reasonName"
                    class="mt-1 break-words text-sm text-navy-800"
                  >
                    Reason: {{ lineSummaries[line.id]!.lost?.reasonName }}
                  </p>
                  <p
                    v-if="lineSummaries[line.id]!.lost?.noteExcerpt"
                    class="mt-1 break-words text-sm text-muted"
                  >
                    {{ lineSummaries[line.id]!.lost?.noteExcerpt }}
                  </p>
                </div>

                <div
                  v-else
                  class="min-w-0"
                >
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                    Next
                  </p>
                  <p
                    v-if="lineSummaries[line.id]!.nextScheduledTrial"
                    class="mt-1 text-sm text-navy-800"
                  >
                    Intro is scheduled.
                  </p>
                  <p
                    v-else
                    class="mt-1 text-sm text-navy-800"
                  >
                    Needs an intro or a decision.
                  </p>
                  <p
                    v-if="lineSummaries[line.id]!.offeringName"
                    class="mt-1 break-words text-sm text-muted"
                  >
                    {{ lineSummaries[line.id]!.offeringName }}
                  </p>
                  <p
                    v-if="lineSummaries[line.id]!.forecastMonthlyCents"
                    class="mt-1 text-sm text-muted"
                  >
                    Forecast MRR ${{ centsToDollarString(lineSummaries[line.id]!.forecastMonthlyCents ?? 0) }}/mo
                  </p>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <AppButton
                  v-if="linePrimaryKind(line) === 'attended' && nextTrialForLine(line)"
                  @click="setOutcome(nextTrialForLine(line)!.id, 'ATTENDED')"
                >
                  Mark attended
                </AppButton>
                <AppButton
                  v-else-if="linePrimaryKind(line) === 'schedule'"
                  @click="startLineAction(line.id, 'schedule')"
                >
                  Schedule trial
                </AppButton>
                <AppButton
                  v-else
                  variant="secondary"
                  @click="toggleLine(line.id)"
                >
                  {{ expandedLineId === line.id ? 'Hide details' : 'View details' }}
                </AppButton>
                <AppButton
                  variant="ghost"
                  type="button"
                  @click="lineMoreId = lineMoreId === line.id ? null : line.id"
                >
                  More
                </AppButton>
              </div>
              <AppOverflowMenu
                :open="lineMoreId === line.id"
                title="Person actions"
                @update:open="lineMoreId = $event ? line.id : null"
              >
                <button
                  v-if="linePrimaryKind(line) !== 'details'"
                  type="button"
                  class="btn btn-subtle min-h-11 w-full justify-start"
                  @click="toggleLine(line.id)"
                >
                  {{ expandedLineId === line.id ? 'Hide details' : 'View details' }}
                </button>
                <button
                  v-if="canWrite && nextTrialForLine(line)?.canRecordTrialOutcome && linePrimaryKind(line) !== 'attended'"
                  type="button"
                  class="btn btn-subtle min-h-11 w-full justify-start"
                  @click="setOutcome(nextTrialForLine(line)!.id, 'ATTENDED')"
                >
                  Attended
                </button>
                <button
                  v-if="canWrite && nextTrialForLine(line)?.canRecordTrialOutcome"
                  type="button"
                  class="btn btn-subtle min-h-11 w-full justify-start"
                  @click="setOutcome(nextTrialForLine(line)!.id, 'NO_SHOW')"
                >
                  No-show
                </button>
                <button
                  v-if="canWrite && nextTrialForLine(line)"
                  type="button"
                  class="btn btn-subtle min-h-11 w-full justify-start"
                  @click="startReschedule(nextTrialForLine(line)!.id); setExpandedLine(line.id)"
                >
                  Reschedule
                </button>
                <button
                  v-if="canWrite && nextTrialForLine(line)"
                  type="button"
                  class="btn btn-subtle min-h-11 w-full justify-start"
                  @click="cancelTrialId = nextTrialForLine(line)!.id"
                >
                  Cancel intro
                </button>
                <button
                  v-if="canWrite && !isLineTerminal(line) && !nextTrialForLine(line) && linePrimaryKind(line) !== 'schedule'"
                  type="button"
                  class="btn btn-subtle min-h-11 w-full justify-start"
                  @click="startLineAction(line.id, 'schedule')"
                >
                  Schedule trial
                </button>
                <button
                  v-if="canWrite && line.status !== 'JOINED' && line.status !== 'LOST'"
                  type="button"
                  class="btn btn-subtle min-h-11 w-full justify-start"
                  @click="startLineAction(line.id, 'convert')"
                >
                  Convert
                </button>
                <button
                  v-if="canWrite && line.status !== 'JOINED' && line.status !== 'LOST'"
                  type="button"
                  class="btn btn-danger min-h-11 w-full justify-start"
                  @click="startLineAction(line.id, 'lost')"
                >
                  Mark lost
                </button>
              </AppOverflowMenu>

              <div
                v-if="expandedLineId === line.id"
                class="mt-4 space-y-4 border-t border-line pt-4"
              >
                <div class="space-y-3">
                  <p class="text-sm font-semibold text-navy-900">
                    Intro for {{ personName(line) }}
                  </p>
                  <div
                    v-if="nextTrialForLine(line)"
                    class="rounded-md border border-line p-4 text-sm"
                  >
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                      {{ trialHasOccurred(nextTrialForLine(line)!) ? 'Intro' : 'Upcoming intro' }}
                    </p>
                    <p class="mt-1 font-medium text-navy-900">
                      {{ toBusinessDateTime(new Date(nextTrialForLine(line)!.scheduledAt).getTime()) }}
                    </p>
                    <p class="text-muted">
                      {{ line.program?.name }}
                      <span v-if="nextTrialForLine(line)?.label"> · {{ nextTrialForLine(line)?.label }}</span>
                    </p>
                    <div
                      v-if="canWrite"
                      class="mt-3 flex flex-wrap gap-2"
                    >
                      <AppButton
                        variant="subtle"
                        @click="startReschedule(nextTrialForLine(line)!.id)"
                      >
                        Reschedule
                      </AppButton>
                      <AppButton
                        variant="ghost"
                        @click="cancelTrialId = nextTrialForLine(line)!.id"
                      >
                        Cancel
                      </AppButton>
                      <AppButton
                        v-if="nextTrialForLine(line)?.canRecordTrialOutcome"
                        variant="secondary"
                        @click="setOutcome(nextTrialForLine(line)!.id, 'ATTENDED')"
                      >
                        Attended
                      </AppButton>
                      <AppButton
                        v-if="nextTrialForLine(line)?.canRecordTrialOutcome"
                        variant="secondary"
                        @click="setOutcome(nextTrialForLine(line)!.id, 'NO_SHOW')"
                      >
                        No show
                      </AppButton>
                    </div>
                    <div
                      v-if="canWrite && reschedulingTrialId === nextTrialForLine(line)!.id"
                      class="mt-3 space-y-3 rounded-md bg-canvas p-4"
                    >
                      <IntroSlotPicker
                        :dates="rescheduleDates"
                        :slots="introSlots ?? []"
                        :selected-date="selectedRescheduleDate"
                        :selected-slot-id="selectedSlotId"
                        :pending="introSlotsPending"
                        :hint="slotHint"
                        @update:selected-date="selectedRescheduleDate = $event"
                        @update:selected-slot-id="selectedSlotId = $event"
                      />
                      <div class="flex flex-wrap gap-2">
                        <AppButton
                          :disabled="!selectedSlotId"
                          @click="reschedule(nextTrialForLine(line)!.id)"
                        >
                          Confirm reschedule
                        </AppButton>
                        <AppButton
                          variant="ghost"
                          type="button"
                          @click="reschedulingTrialId = null"
                        >
                          Close
                        </AppButton>
                      </div>
                    </div>
                  </div>
                  <form
                    v-else-if="canWrite && !isLineTerminal(line) && (lineAction[line.id] === 'schedule' || !historyTrialsForLine(line).length)"
                    class="space-y-3"
                    @submit.prevent="addTrial"
                  >
                    <IntroSlotPicker
                      :dates="rescheduleDates"
                      :slots="introSlots ?? []"
                      :selected-date="selectedAddDate"
                      :selected-slot-id="selectedAddSlotId"
                      :pending="introSlotsPending"
                      :hint="slotHint"
                      @update:selected-date="selectedAddDate = $event"
                      @update:selected-slot-id="selectedAddSlotId = $event"
                    />
                    <AppButton
                      type="submit"
                      :disabled="!selectedAddSlotId"
                    >
                      Schedule trial
                    </AppButton>
                  </form>
                  <AppButton
                    v-else-if="canWrite && !isLineTerminal(line) && lineAction[line.id] !== 'schedule'"
                    variant="subtle"
                    type="button"
                    @click="startLineAction(line.id, 'schedule')"
                  >
                    Schedule another trial
                  </AppButton>
                  <div
                    v-if="historyTrialsForLine(line).length"
                    class="space-y-2"
                  >
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                      Intro history
                    </p>
                    <ul class="space-y-2">
                      <li
                        v-for="trial in historyTrialsForLine(line)"
                        :key="trial.id"
                        class="rounded-md border border-line p-4 text-sm"
                      >
                        <div class="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p class="font-medium text-navy-900">
                              {{ toBusinessDateTime(new Date(trial.scheduledAt).getTime()) }}
                            </p>
                            <p
                              v-if="trial.label"
                              class="text-muted"
                            >
                              {{ trial.label }}
                            </p>
                          </div>
                          <AppBadge :tone="trialStatusTone(trial.status)">
                            {{ trialStatusLabel(trial.status) }}
                          </AppBadge>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <p
                    v-else-if="!nextTrialForLine(line)"
                    class="text-sm text-muted"
                  >
                    No intro history for this person.
                  </p>
                </div>

                <form
                  v-if="canWrite && linePricing[line.id]"
                  class="grid gap-3 sm:grid-cols-2"
                  @submit.prevent="saveLinePricing(line.id)"
                >
                  <AppField label="Offering">
                    <select
                      v-model="linePricing[line.id]!.membershipOfferingId"
                      class="control"
                    >
                      <option value="">
                        Not selected
                      </option>
                      <option
                        v-for="offering in offeringsForLine(line.programId, line.membershipOfferingId)"
                        :key="offering.id"
                        :value="String(offering.id)"
                      >
                        {{ offering.name }} · ${{ centsToDollarString(offering.monthlyCents) }}/mo
                      </option>
                    </select>
                  </AppField>
                  <AppField
                    label="Monthly override"
                    hint="USD, optional"
                  >
                    <input
                      v-model="linePricing[line.id]!.monthlyOverride"
                      class="control"
                      inputmode="decimal"
                      placeholder="Leave blank for household price"
                    >
                  </AppField>
                  <AppField
                    class="sm:col-span-2"
                    label="Override reason"
                  >
                    <input
                      v-model="linePricing[line.id]!.discountReason"
                      class="control"
                      maxlength="400"
                    >
                  </AppField>
                  <p
                    v-if="forecastForLine(line.id)?.overridden"
                    class="sm:col-span-2 text-xs text-warning-800"
                  >
                    Forecast uses the override, not the standard offering price.
                  </p>
                  <div>
                    <AppButton type="submit">
                      Save pricing
                    </AppButton>
                  </div>
                </form>

                <form
                  v-if="canWrite"
                  class="space-y-2"
                  @submit.prevent="saveLineNotes(line.id)"
                >
                  <AppField label="Person notes">
                    <textarea
                      v-model="lineNotes[line.id]"
                      class="control"
                      rows="2"
                      placeholder="Notes about this person only"
                    />
                  </AppField>
                  <AppButton type="submit">
                    Save person note
                  </AppButton>
                </form>
                <p
                  v-else-if="line.notes"
                  class="text-sm text-navy-800"
                >
                  {{ line.notes }}
                </p>

                <div
                  v-if="canManageCompensation"
                  class="rounded-md border border-line p-4"
                >
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                    Compensation attribution
                  </p>
                  <p class="mt-1 text-sm text-muted">
                    This assigns compensation credit for this prospective member only. It does not change household source, ownership, or later staff activity.
                  </p>
                  <div class="mt-3 grid gap-3 sm:grid-cols-2">
                    <AppField label="Credited user">
                      <select
                        v-model="compensationOwner[line.id]"
                        class="control"
                      >
                        <option value="">
                          Unassigned
                        </option>
                        <option
                          v-for="person in staffUsers"
                          :key="person.id"
                          :value="String(person.id)"
                        >
                          {{ person.displayName }}
                        </option>
                      </select>
                    </AppField>
                    <AppField label="Eligibility">
                      <select
                        v-model="compensationEligibility[line.id]"
                        class="control"
                      >
                        <option value="UNASSIGNED">
                          Unassigned
                        </option>
                        <option value="ELIGIBLE">
                          Eligible
                        </option>
                        <option value="INELIGIBLE">
                          Ineligible
                        </option>
                      </select>
                    </AppField>
                    <AppField
                      class="sm:col-span-2"
                      label="Correction reason"
                      hint="Required for every manual assignment or change."
                      :error="(compensationReason[line.id] || '').trim().length > 0 && (compensationReason[line.id] || '').trim().length < 3 ? 'Explain this assignment in a few words.' : undefined"
                    >
                      <textarea
                        v-model="compensationReason[line.id]"
                        class="control"
                        rows="2"
                        placeholder="Explain this assignment in a few words."
                      />
                    </AppField>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <AppButton @click="saveCompensation(line.id)">
                      Save compensation
                    </AppButton>
                    <AppBadge
                      v-if="line.compensationAttribution"
                      :tone="line.compensationAttribution.origin === 'MANUAL' ? 'warning' : 'success'"
                    >
                      {{ line.compensationAttribution.origin }} · {{ line.compensationAttribution.method }} · {{ line.compensationAttribution.eligibility }}
                    </AppBadge>
                  </div>
                  <div
                    v-if="line.compensationAttribution"
                    class="mt-3 space-y-2 text-sm"
                  >
                    <p class="font-medium text-navy-900">
                      Current: {{ line.compensationAttribution.creditedUser?.displayName || 'Unassigned' }}
                      <span class="text-muted"> · established {{ toBusinessDateTime(new Date(line.compensationAttribution.establishedAt).getTime()) }}</span>
                    </p>
                    <p
                      v-if="line.compensationAttribution.campaign?.name"
                      class="text-muted"
                    >
                      Evidence campaign:
                      <NuxtLink
                        v-if="canViewMarketing && line.compensationAttribution.campaign.id"
                        :to="campaignStaffPath(line.compensationAttribution.campaign.id)"
                        class="font-medium text-navy-800 hover:text-brand-700"
                      >
                        {{ line.compensationAttribution.campaign.name }}
                      </NuxtLink>
                      <template v-else>
                        {{ line.compensationAttribution.campaign.name }}
                      </template>
                    </p>
                    <div v-if="line.compensationEarned?.length">
                      <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                        Earned snapshots
                      </p>
                      <ul class="mt-1 space-y-1">
                        <li
                          v-for="earned in line.compensationEarned"
                          :key="earned.id"
                        >
                          ${{ centsToDollarString(earned.amountCents) }} · {{ earned.paymentStatus }}
                          · {{ toBusinessDateTime(new Date(earned.earnedAt).getTime()) }}
                        </li>
                      </ul>
                    </div>
                    <div v-if="line.compensationAttribution.history?.length">
                      <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                        Attribution history
                      </p>
                      <ul class="mt-1 space-y-1">
                        <li
                          v-for="item in line.compensationAttribution.history"
                          :key="item.id"
                          class="text-muted"
                        >
                          {{ toBusinessDateTime(new Date(item.createdAt).getTime()) }} ·
                          {{ item.actor?.displayName || 'System' }} ·
                          {{ item.method }} / {{ item.origin }} / {{ item.eligibility }} ·
                          {{ item.reason || 'No note recorded.' }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div
                  v-if="activeConversion(line)"
                  class="rounded-md bg-canvas p-4 text-sm"
                >
                  <p class="font-medium text-navy-900">
                    Converted MRR ${{ centsToDollarString(activeConversion(line)!.monthlyCents) }}/mo
                    <span v-if="activeConversion(line)!.offeringName">
                      · {{ activeConversion(line)!.offeringName }}
                    </span>
                  </p>
                  <p class="text-muted">
                    Snapshot. Changing the offering later does not rewrite this.
                  </p>
                  <form
                    v-if="canAdmin"
                    class="mt-2 grid gap-2 sm:grid-cols-2"
                    @submit.prevent="reverseLineConversion(activeConversion(line)!.id)"
                  >
                    <AppField
                      label="Reverse note"
                      required
                    >
                      <input
                        v-model="reverseNote[activeConversion(line)!.id]"
                        class="control"
                        required
                      >
                    </AppField>
                    <div class="flex items-end">
                      <AppButton
                        type="submit"
                        variant="subtle"
                      >
                        Reverse conversion
                      </AppButton>
                    </div>
                  </form>
                </div>

                <div
                  v-if="line.status === 'LOST'"
                  class="rounded-md bg-canvas p-4 text-sm"
                >
                  <p class="text-muted">
                    Lost{{ latestLost(line)?.lostReason ? ` · ${latestLost(line)?.lostReason?.name}` : '' }}
                  </p>
                  <form
                    v-if="canWrite"
                    class="mt-2 grid gap-2 sm:grid-cols-2"
                    @submit.prevent="reopenLine(line.id)"
                  >
                    <AppField
                      label="Reopen note"
                      required
                    >
                      <input
                        v-model="reopenNote[line.id]"
                        class="control"
                        required
                      >
                    </AppField>
                    <div class="flex items-end">
                      <AppButton type="submit">
                        Reopen
                      </AppButton>
                    </div>
                  </form>
                </div>

                <form
                  v-if="canWrite && lineAction[line.id] === 'convert' && linePricing[line.id]"
                  class="grid gap-2 rounded-md bg-canvas p-4"
                  @submit.prevent="convertLine(line.id)"
                >
                  <AppAlert v-if="errorMessage">
                    {{ errorMessage }}
                  </AppAlert>
                  <AppField
                    label="Offering"
                    required
                  >
                    <select
                      v-model="linePricing[line.id]!.membershipOfferingId"
                      class="control"
                      required
                    >
                      <option value="">
                        Select an offering
                      </option>
                      <option
                        v-for="offering in offeringsForLine(line.programId, line.membershipOfferingId)"
                        :key="offering.id"
                        :value="String(offering.id)"
                      >
                        {{ offering.name }} · ${{ centsToDollarString(offering.monthlyCents) }}/mo
                      </option>
                    </select>
                  </AppField>
                  <AppField label="Conversion note">
                    <input
                      v-model="convertNote[line.id]"
                      class="control"
                    >
                  </AppField>
                  <AppButton
                    type="submit"
                    :disabled="!linePricing[line.id]?.membershipOfferingId"
                  >
                    Confirm convert
                  </AppButton>
                </form>

                <form
                  v-if="canWrite && lineAction[line.id] === 'lost'"
                  class="grid gap-2 rounded-md bg-canvas p-4"
                  @submit.prevent="markLineLost(line.id)"
                >
                  <AppField
                    label="Lost reason"
                    required
                  >
                    <select
                      v-model="lostReasonId[line.id]"
                      class="control"
                      required
                    >
                      <option value="">
                        Select
                      </option>
                      <option
                        v-for="reason in lostReasons ?? []"
                        :key="reason.id"
                        :value="String(reason.id)"
                      >
                        {{ reason.name }}
                      </option>
                    </select>
                  </AppField>
                  <AppField label="Lost note">
                    <input
                      v-model="lostNote[line.id]"
                      class="control"
                    >
                  </AppField>
                  <AppButton
                    type="submit"
                    variant="danger"
                  >
                    Confirm lost
                  </AppButton>
                </form>
              </div>
            </li>
          </ul>

          <form
            v-if="canWrite && addingPerson"
            class="mt-4 rounded-md bg-canvas p-4"
            @submit.prevent="addHouseholdLine"
          >
            <AppFieldGroup title="Person">
              <AppField
                label="First name"
                required
              >
                <input
                  v-model="newLine.firstName"
                  class="control"
                  required
                >
              </AppField>
              <AppField label="Last name">
                <input
                  v-model="newLine.lastName"
                  class="control"
                >
              </AppField>
              <AppField
                label="Relationship"
                :hint="hasSelfLine ? 'Self is already the primary contact on this household.' : undefined"
              >
                <select
                  v-model="newLine.relationship"
                  class="control"
                >
                  <option
                    v-if="!hasSelfLine"
                    value="SELF"
                  >
                    Self
                  </option>
                  <option value="CHILD">
                    Child
                  </option>
                  <option value="SPOUSE">
                    Spouse
                  </option>
                  <option value="OTHER">
                    Other
                  </option>
                </select>
              </AppField>
            </AppFieldGroup>
            <AppFieldGroup title="Program">
              <AppField
                label="Program"
                required
              >
                <select
                  v-model="newLine.programId"
                  class="control"
                  required
                >
                  <option value="">
                    Select
                  </option>
                  <option
                    v-for="program in programs ?? []"
                    :key="program.id"
                    :value="String(program.id)"
                  >
                    {{ program.name }}
                  </option>
                </select>
              </AppField>
              <AppField label="Age (kids)">
                <input
                  v-model="newLine.age"
                  type="number"
                  min="0"
                  class="control control-short"
                >
              </AppField>
              <AppField label="Offering">
                <select
                  v-model="newLine.membershipOfferingId"
                  class="control"
                >
                  <option value="">
                    Optional
                  </option>
                  <option
                    v-for="offering in offerings ?? []"
                    :key="offering.id"
                    :value="String(offering.id)"
                  >
                    {{ offering.name }}
                  </option>
                </select>
              </AppField>
              <AppField
                class="sm:col-span-2"
                label="Person note"
              >
                <input
                  v-model="newLine.notes"
                  class="control"
                >
              </AppField>
            </AppFieldGroup>
            <div class="mt-4 flex flex-wrap items-end gap-2">
              <AppButton type="submit">
                Add person
              </AppButton>
              <AppButton
                variant="ghost"
                type="button"
                @click="addingPerson = false"
              >
                Cancel
              </AppButton>
            </div>
          </form>
        </AppPanel>

        <AppPanel
          v-if="active === 'follow-up'"
          title="Household follow-up"
        >
          <template #actions>
            <NuxtLink
              to="/tasks"
              class="text-sm font-medium text-brand-700 hover:text-brand-600"
            >
              Open follow-up queue
            </NuxtLink>
          </template>
          <div
            v-if="followUpMode === 'empty'"
            class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <p class="text-sm text-muted">
              No open follow-up calls.
            </p>
            <div class="flex flex-wrap gap-2">
              <AppButton
                v-if="canWrite"
                variant="secondary"
                type="button"
                :aria-expanded="schedulingFollowUp"
                @click="schedulingFollowUp = !schedulingFollowUp"
              >
                {{ schedulingFollowUp ? 'Close scheduling' : 'Schedule follow-up' }}
              </AppButton>
              <AppButton
                v-if="completedFollowUps.length"
                variant="ghost"
                type="button"
                :aria-expanded="showCompletedFollowUp"
                @click="showCompletedFollowUp = !showCompletedFollowUp"
              >
                {{ showCompletedFollowUp ? 'Hide completed calls' : `Show completed calls (${completedFollowUps.length})` }}
              </AppButton>
            </div>
          </div>
          <ul
            v-if="pendingFollowUps.length"
            class="mt-4 space-y-3"
          >
            <li
              v-for="task in pendingFollowUps"
              :key="task.id"
              class="rounded-md border border-line p-4 text-sm"
              :class="task.dueState === 'OVERDUE' ? 'border-l-4 border-l-danger-700' : ''"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <p class="font-medium text-navy-900">
                  {{ followUpPurposeLabel(task.purpose) }} · {{ taskStatusLabel(task.status) }}
                </p>
                <AppBadge
                  v-if="task.dueState"
                  :tone="dueStateTone(task.dueState)"
                >
                  {{ dueStateLabel(task.dueState) }}
                </AppBadge>
              </div>
              <p class="mt-1 text-muted">
                Due {{ toBusinessDateTime(new Date(task.dueAt).getTime()) }}
              </p>
              <p class="text-muted">
                Assigned to {{ task.assignedUser?.displayName || 'Unassigned' }}
              </p>
              <p
                v-if="task.notes"
                class="mt-2 whitespace-pre-wrap text-muted"
              >
                {{ task.notes }}
              </p>
              <div
                v-if="task.confirmationIntros?.length"
                class="mt-2 rounded-md bg-canvas p-4"
              >
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                  Confirm intros
                </p>
                <ul class="mt-1 space-y-1">
                  <li
                    v-for="intro in task.confirmationIntros"
                    :key="intro.trialId"
                    class="text-navy-800"
                  >
                    {{ personName({ firstName: intro.firstName, lastName: intro.lastName }, 'Prospect') }}
                    <span v-if="intro.programName"> — {{ intro.programName }}</span>
                    — {{ toBusinessDateTime(new Date(intro.scheduledAt).getTime()) }}
                  </li>
                </ul>
              </div>
              <p
                v-else-if="task.linkedLines?.length"
                class="text-muted"
              >
                Linked:
                {{ task.linkedLines.map(person => personName(person)).join(', ') }}
              </p>
              <p
                v-else-if="task.trial?.label && task.purpose !== 'EVENT_FOLLOW_UP'"
                class="text-muted"
              >
                {{ task.trial.label }}
              </p>
              <div
                v-if="canWrite"
                class="mt-3 space-y-2"
              >
                <div class="flex flex-wrap gap-2">
                  <select
                    :value="taskAssignee[task.id] ?? (task.assignedUser?.id != null ? String(task.assignedUser.id) : '')"
                    class="control max-w-xs"
                    @change="taskAssignee[task.id] = ($event.target as HTMLSelectElement).value"
                  >
                    <option value="">
                      Unassigned
                    </option>
                    <option
                      v-for="person in staffUsers"
                      :key="person.id"
                      :value="person.id"
                    >
                      {{ person.displayName }}
                    </option>
                  </select>
                  <AppButton
                    variant="secondary"
                    @click="assignFollowUp(task.id)"
                  >
                    Assign
                  </AppButton>
                  <AppButton
                    @click="completingTaskId = task.id; taskNote = task.notes ?? ''; taskOutcome = 'REACHED'"
                  >
                    Complete
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    @click="cancelTaskId = task.id"
                  >
                    Cancel
                  </AppButton>
                </div>
                <form
                  v-if="completingTaskId === task.id"
                  class="space-y-2 rounded-md bg-canvas p-4"
                  @submit.prevent="patchFollowUp(task.id, { action: 'complete', outcome: taskOutcome, notes: taskNote || undefined })"
                >
                  <select
                    v-model="taskOutcome"
                    class="control"
                  >
                    <option
                      v-for="[value, label] in taskOutcomes"
                      :key="value"
                      :value="value"
                    >
                      {{ label }}
                    </option>
                  </select>
                  <textarea
                    v-model="taskNote"
                    rows="2"
                    class="control"
                    placeholder="Optional note"
                  />
                  <AppButton type="submit">
                    Save result
                  </AppButton>
                </form>
              </div>
            </li>
          </ul>
          <div
            v-if="pendingFollowUps.length && canWrite"
            class="mt-4"
          >
            <AppButton
              variant="subtle"
              type="button"
              :aria-expanded="schedulingFollowUp"
              @click="schedulingFollowUp = !schedulingFollowUp"
            >
              {{ schedulingFollowUp ? 'Close scheduling' : 'Add another call' }}
            </AppButton>
          </div>
          <form
            v-if="canWrite && schedulingFollowUp"
            class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
            @submit.prevent="addManualFollowUp"
          >
            <input
              v-model="manualDueAt"
              type="datetime-local"
              class="control"
              required
              aria-label="Follow-up due date"
            >
            <input
              v-model="manualTaskNote"
              placeholder="Optional note"
              class="control"
            >
            <AppButton type="submit">
              Add call
            </AppButton>
          </form>
          <div
            v-if="completedFollowUps.length && pendingFollowUps.length"
            class="mt-4"
          >
            <AppButton
              variant="ghost"
              type="button"
              :aria-expanded="showCompletedFollowUp"
              @click="showCompletedFollowUp = !showCompletedFollowUp"
            >
              {{ showCompletedFollowUp ? 'Hide completed calls' : `Show completed calls (${completedFollowUps.length})` }}
            </AppButton>
          </div>
          <ul
            v-if="showCompletedFollowUp && completedFollowUps.length"
            class="panel-list mt-3 space-y-3"
          >
            <li
              v-for="task in completedFollowUps"
              :key="task.id"
              class="rounded-md border border-line p-4 text-sm text-muted"
            >
              <p class="font-medium text-navy-900">
                {{ followUpPurposeLabel(task.purpose) }} · {{ taskStatusLabel(task.status) }}
              </p>
              <p
                v-if="task.linkedLines?.length"
                class="mt-1"
              >
                Linked: {{ task.linkedLines.map(person => personName(person)).join(', ') }}
              </p>
              <p
                v-if="task.outcome"
                class="mt-1"
              >
                Outcome: {{ FOLLOW_UP_CALL_OUTCOME_LABELS[task.outcome as FollowUpCallOutcome] || task.outcome }}
              </p>
              <p
                v-if="task.completedAt"
                class="mt-1 text-xs"
              >
                Completed {{ toBusinessDateTime(new Date(task.completedAt).getTime()) }}
                <span v-if="task.completedBy"> by {{ task.completedBy.displayName }}</span>
              </p>
            </li>
          </ul>
        </AppPanel>

        <AppPanel
          v-if="active === 'attribution'"
          title="Household attribution"
          description="First-touch Campaign, tracking, and UTM live on the household. Compensation credit is assigned per prospective member."
        >
          <p class="text-sm">
            Source {{ sourceLabel(lead.source) }}
          </p>
          <p
            v-if="lead.campaign?.name"
            class="mt-1 text-sm"
          >
            Recruited through
            <NuxtLink
              v-if="canViewMarketing && lead.campaign.id"
              :to="campaignStaffPath(lead.campaign.id)"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              {{ lead.campaign.name }}
            </NuxtLink>
            <template v-else>
              {{ lead.campaign.name }}
            </template>
            <span
              v-if="lead.trackingLink?.label"
              class="text-muted"
            >
              · {{ lead.trackingLink.label }}
            </span>
          </p>
          <p
            v-for="item in lead.acquisitionEvents ?? []"
            :key="`attr-event-${item.id}`"
            class="mt-1 text-sm"
          >
            {{ lead.campaign?.name ? 'Also through' : 'Recruited through' }}
            <NuxtLink
              v-if="canViewMarketing"
              :to="eventStaffPath(item.id)"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              {{ item.title }}
            </NuxtLink>
            <template v-else>
              {{ item.title }}
            </template>
            <span
              v-if="item.sessions.length"
              class="text-muted"
            >
              · {{ item.sessions.map(session => session.name).join(', ') }}
            </span>
          </p>
          <p
            v-if="lead.utmSource || lead.utmMedium || lead.utmContent || lead.utmTerm"
            class="mt-1 text-sm text-muted"
          >
            {{ [lead.utmSource, lead.utmMedium, lead.utmContent, lead.utmTerm].filter(Boolean).join(' · ') }}
          </p>
          <div class="mt-4 space-y-4">
            <div
              v-for="line in lead.lines ?? []"
              :key="line.id"
              class="rounded-md border border-line p-4 text-sm"
            >
              <p class="font-medium text-navy-900">
                {{ personName(line) }}
              </p>
              <p
                v-if="line.compensationAttribution"
                class="mt-1 text-muted"
              >
                {{ line.compensationAttribution.creditedUser?.displayName || 'Unassigned' }}
                · {{ line.compensationAttribution.origin }}
                · {{ line.compensationAttribution.method }}
                · {{ line.compensationAttribution.eligibility }}
                · established {{ toBusinessDateTime(new Date(line.compensationAttribution.establishedAt).getTime()) }}
              </p>
              <p
                v-else
                class="mt-1 text-muted"
              >
                No compensation attribution yet
              </p>
              <p
                v-if="line.compensationAttribution?.campaign?.name"
                class="mt-1"
              >
                Evidence campaign:
                <NuxtLink
                  v-if="canViewMarketing && line.compensationAttribution.campaign.id"
                  :to="campaignStaffPath(line.compensationAttribution.campaign.id)"
                  class="font-medium text-brand-700 hover:text-brand-600"
                >
                  {{ line.compensationAttribution.campaign.name }}
                </NuxtLink>
                <template v-else>
                  {{ line.compensationAttribution.campaign.name }}
                </template>
              </p>
              <ul
                v-if="line.compensationEarned?.length"
                class="mt-2 space-y-1 text-muted"
              >
                <li
                  v-for="earned in line.compensationEarned"
                  :key="earned.id"
                >
                  Earned ${{ centsToDollarString(earned.amountCents) }}
                  · {{ earned.paymentStatus }}
                  · {{ toBusinessDateTime(new Date(earned.earnedAt).getTime()) }}
                </li>
              </ul>
              <ul
                v-if="line.compensationAttribution?.history?.length"
                class="mt-2 space-y-1 text-muted"
              >
                <li
                  v-for="item in line.compensationAttribution.history"
                  :key="item.id"
                >
                  {{ toBusinessDateTime(new Date(item.createdAt).getTime()) }}
                  · {{ item.actor?.displayName || 'System' }}
                  · {{ item.method }} / {{ item.origin }} / {{ item.eligibility }}
                  · {{ item.reason || 'No note recorded.' }}
                </li>
              </ul>
            </div>
          </div>
          <p class="mt-3 text-sm text-muted">
            Assign or correct compensation credit in Members → person details.
            The compensation ledger stays at
            <NuxtLink
              to="/marketing/compensation"
              class="font-medium text-brand-700 hover:text-brand-600"
            >
              /marketing/compensation
            </NuxtLink>.
          </p>
        </AppPanel>

        <AppPanel
          v-if="active === 'attribution' && forecast && forecastMode === 'active'"
          title="Household forecast"
          description="Open opportunity only. JOINED and LOST people are excluded. This is not cash collected."
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Forecast MRR
              </p>
              <p class="mt-1 break-words font-medium text-navy-900">
                ${{ centsToDollarString(forecast.monthlyCents) }}
              </p>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Forecasted enrollment / upfront
              </p>
              <p class="mt-1 break-words font-medium text-navy-900">
                ${{ centsToDollarString(forecast.enrollmentCents) }}
              </p>
            </div>
          </div>
          <ul
            v-if="openForecastBreakdown.length"
            class="mt-4 space-y-2 text-sm"
          >
            <li
              v-for="row in openForecastBreakdown"
              :key="row.leadLineId"
              class="flex flex-wrap items-baseline justify-between gap-2"
            >
              <span class="min-w-0 break-words text-navy-800">
                {{ row.line ? personName(row.line) : 'Prospective member' }}
              </span>
              <span class="shrink-0 tabular-nums text-navy-900">
                ${{ centsToDollarString(row.forecastMonthlyCents) }}/mo
              </span>
            </li>
          </ul>
        </AppPanel>
        <p
          v-else-if="active === 'attribution' && forecast"
          class="text-sm text-muted"
        >
          Open Forecast MRR $0. No remaining conversion opportunity.
        </p>

        <div
          v-if="active === 'notes'"
          class="grid gap-6 lg:grid-cols-2"
        >
          <AppPanel title="Household notes">
            <form
              v-if="canWrite"
              class="space-y-2"
              @submit.prevent="addNote"
            >
              <textarea
                v-model="noteBody"
                class="control"
                rows="2"
                placeholder="Add a household note"
              />
              <AppButton type="submit">
                Add household note
              </AppButton>
            </form>
            <p
              v-if="!lead.notes?.length"
              class="mt-3 text-sm text-muted"
            >
              No household notes.
            </p>
            <template v-else>
              <AppButton
                class="mt-3"
                variant="ghost"
                type="button"
                :aria-expanded="showHouseholdNotes"
                @click="showHouseholdNotes = !showHouseholdNotes"
              >
                {{ showHouseholdNotes ? 'Hide household notes' : `Show household notes (${lead.notes.length})` }}
              </AppButton>
              <ul
                v-if="showHouseholdNotes"
                class="mt-3 space-y-2 text-sm"
              >
                <li
                  v-for="note in lead.notes"
                  :key="note.id"
                  class="break-words"
                >
                  {{ note.body }}
                  <span class="text-muted"> · {{ toBusinessDateTime(new Date(note.createdAt).getTime()) }}</span>
                </li>
              </ul>
            </template>
          </AppPanel>
          <AppPanel title="Possible duplicates">
            <p
              v-if="!duplicateWarnings.length"
              class="text-sm text-muted"
            >
              No matching households flagged.
            </p>
            <ul
              v-else
              class="space-y-2 text-sm"
            >
              <li
                v-for="item in duplicateWarnings"
                :key="item.key"
                class="break-words"
              >
                {{ contactMatchKindLabel(item.matchKind) }} match with
                <NuxtLink
                  :to="leadStaffPath(item.id, route.query)"
                  class="font-medium text-brand-700 hover:text-brand-600"
                >
                  {{ item.name }}
                </NuxtLink>
                <template v-if="item.detectedAt">
                  · detected {{ toBusinessDateTime(new Date(item.detectedAt).getTime()) }}
                </template>
              </li>
            </ul>
          </AppPanel>
          <AppPanel title="Household status history">
            <p
              v-if="!lead.statusHistory?.length"
              class="text-sm text-muted"
            >
              No status history.
            </p>
            <template v-else>
              <AppButton
                variant="ghost"
                type="button"
                :aria-expanded="showStatusHistory"
                @click="showStatusHistory = !showStatusHistory"
              >
                {{ showStatusHistory ? 'Hide status history' : `Show status history (${lead.statusHistory.length})` }}
              </AppButton>
              <ul
                v-if="showStatusHistory"
                class="mt-3 space-y-2 text-sm"
              >
                <li
                  v-for="item in lead.statusHistory"
                  :key="item.id"
                  class="break-words"
                >
                  {{ item.fromStatus ? leadStatusLabel(item.fromStatus) : '—' }}
                  → {{ leadStatusLabel(item.toStatus) }}
                  <span
                    v-if="item.note && !statusHistoryNoteIsRedundant(item.note, item.toStatus)"
                    class="text-muted"
                  > · {{ item.note }}</span>
                </li>
              </ul>
            </template>
          </AppPanel>
        </div>
      </AppRecordTabs>
    </template>

    <AppConfirm
      :open="cancelTrialId != null"
      title="Cancel this intro?"
      description="The visit stays in history as cancelled. A still-open confirmation call for this trial will be cancelled too."
      confirm-label="Cancel intro"
      danger
      @update:open="closeTrialConfirm"
      @confirm="confirmCancelTrial"
    />
    <AppConfirm
      :open="cancelTaskId != null"
      title="Cancel this follow-up?"
      description="The call leaves the open queue. History is kept."
      confirm-label="Cancel call"
      danger
      @update:open="closeTaskConfirm"
      @confirm="confirmCancelTask"
    />
  </AppRecordWorkspace>
</template>
