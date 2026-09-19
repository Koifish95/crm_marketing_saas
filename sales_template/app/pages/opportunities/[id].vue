<script setup lang="ts">
import {
  ACTIVE_OPPORTUNITY_STAGES,
  ACTIVITY_TYPES,
  LOSS_REASONS,
  activityOutcomeLabel,
  activityTypeLabel,
  isTerminalOpportunityStage,
  lossReasonLabel,
  opportunityStageLabel,
  type OpportunityStage,
} from '#shared/utils/pipeline'
import { formatUsdFromCents } from '#shared/utils/money'
import { OFFER_PRICING_TYPES, offerPricingTypeLabel } from '#shared/utils/catalog'
import {
  canCreateProposalRevision,
  canRecordIssuedProposalActions,
  canUploadSignedProposal,
  formatProposalLabel,
  isPastValidThrough,
  proposalStatusDisplay,
  resolveSelectedProposalRevision,
} from '#shared/utils/proposals'
import { denverYmd, utcNowMs } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Company = { id: number, name: string }
type Contact = { id: number, accountId: number, firstName: string, lastName: string, title: string | null, email: string | null, phone: string | null }
type Assignee = { id: number, displayName: string }
type Opportunity = {
  id: number
  accountId: number
  primaryContactId: number | null
  sourceLeadId: number | null
  name: string
  amountCents: number | null
  mrrCents: number | null
  stage: OpportunityStage
  ownerUserId: number | null
  lossReason: string | null
  lossNotes: string | null
  notes: string | null
  sourceId: number | null
  campaignId: number | null
  sourceDetail: string | null
  sourceName: string | null
  campaignName: string | null
  capturedSourceName: string | null
  capturedCampaignName: string | null
  capturedTrackingLinkLabel: string | null
  wonAt: string | Date | null
  lostAt: string | Date | null
}
type Line = {
  id: number
  description: string
  quantity: number
  pricingType: string
  unitPriceCents: number
  oneTimeCents: number
  mrrCents: number
  offerId: number | null
}
type Offer = { id: number, name: string, pricingType: string, defaultUnitPriceCents: number, active: boolean }
type Source = { id: number, name: string }
type Campaign = { id: number, name: string }
type Activity = {
  id: number
  description: string
  status: string
  type: string
  outcome: string | null
  dueAt: string | Date | null
  notes: string | null
}
type ProposalRevision = {
  id: number
  revision: number
  status: string
  title: string
  intro: string | null
  terms: string | null
  notes: string | null
  validThrough: string | null
  sentAt: string | Date | null
  recipientContactId: number | null
  signedPdfPath: string | null
  signedPdfOriginalName: string | null
  amountCents: number
  mrrCents: number
}
type ProposalBundle = {
  proposal: { id: number, proposalNumber: string }
  current: ProposalRevision
  revisions: ProposalRevision[]
  pastValidThrough: boolean
  label: string
}

const { data: companies } = await useFetch<Company[]>('/api/companies')
const { data: assignees } = await useFetch<Assignee[]>('/api/assignees')
const { data: sources } = await useFetch<Source[]>('/api/sources')
const { data: campaigns } = await useFetch<Campaign[]>('/api/campaigns')
const { data: offers } = await useFetch<Offer[]>('/api/offers', { query: { active: 'true' } })
const { data: opportunity, error, pending, refresh } = await useFetch<Opportunity>(() => `/api/opportunities/${id.value}`)
const { data: lines, refresh: refreshLines } = await useFetch<Line[]>(() => `/api/opportunities/${id.value}/lines`)
const { data: contacts } = await useFetch<Contact[]>('/api/contacts', {
  query: computed(() => ({ accountId: opportunity.value ? String(opportunity.value.accountId) : undefined })),
})
const { data: activities, refresh: refreshActivities } = await useFetch<Activity[]>('/api/activities', {
  query: computed(() => ({ opportunityId: String(id.value) })),
})
type ServeHandoff = {
  companyName: string
  opportunityName: string
  oneTimeCents: number
  mrrCents: number
  primaryContact: { name: string, email: string | null, phone: string | null } | null
  lines: Array<{ description: string, pricingType: string, unitPriceCents: number }>
  nextSteps: string[]
}

const { data: proposalBundle, refresh: refreshProposal } = await useFetch<ProposalBundle | null>(() => `/api/opportunities/${id.value}/proposal`)
const { data: handoff, refresh: refreshHandoff } = await useFetch<ServeHandoff>(() => `/api/opportunities/${id.value}/handoff`)

useHead({
  title: computed(() => opportunity.value?.name || 'Opportunity'),
})

const name = ref('')
const notes = ref('')
const primaryContactId = ref('')
const ownerUserId = ref('')
const sourceId = ref('')
const campaignId = ref('')
const sourceDetail = ref('')
const lossReason = ref('budget')
const lossNotes = ref('')
const activityDescription = ref('')
const activityType = ref('call')
const activityDue = ref('')
const completingId = ref<number | null>(null)
const cancelOpenOnClose = ref(true)
const confirmClose = ref<'won' | 'lost' | null>(null)
const lineDescription = ref('')
const lineQuantity = ref('1')
const linePrice = ref('')
const lineType = ref('one_time')
const lineOfferId = ref('')
const editingLineId = ref<number | null>(null)
const editOfferId = ref('')
const editDescription = ref('')
const editQuantity = ref('1')
const editPrice = ref('')
const editType = ref('one_time')
const signedFileInput = ref<HTMLInputElement | null>(null)
const selectedRevisionId = ref<number | null>(null)
const proposalTitle = ref('')
const proposalIntro = ref('')
const proposalTerms = ref('')
const proposalNotes = ref('')
const proposalValidThrough = ref('')
const proposalRecipientId = ref('')
const saving = ref(false)
const notice = ref('')
const editingDetails = ref(false)
const formError = ref('')

function callApi(url: string, opts: { method?: string, body?: unknown } = {}) {
  return ($fetch as (input: string, init?: { method?: string, body?: unknown }) => Promise<unknown>)(url, opts)
}

function applyRevisionToForm(revision: ProposalRevision) {
  proposalTitle.value = revision.title
  proposalIntro.value = revision.intro || ''
  proposalTerms.value = revision.terms || ''
  proposalNotes.value = revision.notes || ''
  proposalValidThrough.value = revision.validThrough || ''
  proposalRecipientId.value = revision.recipientContactId ? String(revision.recipientContactId) : ''
}

function selectProposalRevision(revisionId: number) {
  const bundle = proposalBundle.value
  if (!bundle) {
    return
  }
  const selected = resolveSelectedProposalRevision(bundle.revisions, revisionId, bundle.current)
  selectedRevisionId.value = selected.id
  applyRevisionToForm(selected)
}

watch(opportunity, (value) => {
  if (!value) {
    return
  }
  name.value = value.name
  notes.value = value.notes || ''
  primaryContactId.value = value.primaryContactId ? String(value.primaryContactId) : ''
  ownerUserId.value = value.ownerUserId ? String(value.ownerUserId) : ''
  sourceId.value = value.sourceId ? String(value.sourceId) : ''
  campaignId.value = value.campaignId ? String(value.campaignId) : ''
  sourceDetail.value = value.sourceDetail || ''
  lossReason.value = value.lossReason || 'budget'
  lossNotes.value = value.lossNotes || ''
}, { immediate: true })

watch(proposalBundle, (value) => {
  if (!value) {
    selectedRevisionId.value = null
    return
  }
  const selected = resolveSelectedProposalRevision(value.revisions, selectedRevisionId.value, value.current)
  selectedRevisionId.value = selected.id
  applyRevisionToForm(selected)
}, { immediate: true })

const selectedRevision = computed(() => {
  const bundle = proposalBundle.value
  if (!bundle) {
    return null
  }
  return resolveSelectedProposalRevision(bundle.revisions, selectedRevisionId.value, bundle.current)
})

const selectedPastValidThrough = computed(() => {
  return isPastValidThrough(selectedRevision.value?.validThrough, denverYmd(utcNowMs()))
})

const terminal = computed(() => opportunity.value ? isTerminalOpportunityStage(opportunity.value.stage) : false)

const opportunityHeaderStatus = computed(() => {
  const stage = opportunity.value?.stage
  if (!stage) {
    return ''
  }
  if (stage === 'won' || stage === 'lost') {
    return opportunityStageLabel(stage)
  }
  return `Open · ${opportunityStageLabel(stage)}`
})

async function save(nextStage?: 'working' | 'proposal_quote' | 'decision') {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}`, {
      method: 'PATCH',
      body: {
        name: name.value,
        notes: notes.value,
        stage: nextStage,
        primaryContactId: primaryContactId.value ? Number(primaryContactId.value) : null,
        ownerUserId: ownerUserId.value ? Number(ownerUserId.value) : undefined,
        sourceId: sourceId.value ? Number(sourceId.value) : null,
        campaignId: campaignId.value ? Number(campaignId.value) : null,
        sourceDetail: sourceDetail.value || null,
      },
    })
    await refresh()
    notice.value = nextStage ? `Moved to ${opportunityStageLabel(nextStage)}.` : 'Saved.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save.'
  } finally {
    saving.value = false
  }
}

const openActivities = computed(() => (activities.value || []).filter(row => row.status === 'open'))

async function requestWon() {
  if (openActivities.value.length) {
    confirmClose.value = 'won'
    return
  }
  await markWon()
}

async function requestLost() {
  if (openActivities.value.length) {
    confirmClose.value = 'lost'
    return
  }
  await markLost()
}

async function markWon() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}/won`, {
      method: 'POST',
      body: { cancelOpenActivities: cancelOpenOnClose.value },
    })
    confirmClose.value = null
    await refresh()
    await refreshActivities()
    await refreshHandoff()
    notice.value = 'Marked Won (signed agreement / SOW). Next: serve in Control Plane.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not mark Won.'
  } finally {
    saving.value = false
  }
}

async function markLost() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}/lost`, {
      method: 'POST',
      body: {
        lossReason: lossReason.value,
        lossNotes: lossNotes.value || undefined,
        cancelOpenActivities: cancelOpenOnClose.value,
      },
    })
    confirmClose.value = null
    await refresh()
    await refreshActivities()
    notice.value = 'Marked Lost.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not mark Lost.'
  } finally {
    saving.value = false
  }
}

async function reopen() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}/reopen`, { method: 'POST' })
    await refresh()
    notice.value = 'Reopened to Decision.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not reopen.'
  } finally {
    saving.value = false
  }
}

async function addActivity() {
  formError.value = ''
  try {
    await $fetch('/api/activities', {
      method: 'POST',
      body: {
        opportunityId: id.value,
        description: activityDescription.value,
        type: activityType.value,
        dueAt: activityDue.value ? new Date(activityDue.value).getTime() : undefined,
      },
    })
    activityDescription.value = ''
    activityDue.value = ''
    await refreshActivities()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not add activity.'
  }
}

async function completeActivity(activity: Activity, payload: {
  outcome?: string
  notes: string
  next?: { type: string, description: string, dueAt: number }
}) {
  formError.value = ''
  try {
    await $fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      body: {
        completed: true,
        outcome: payload.outcome,
        notes: payload.notes || undefined,
        nextActivity: payload.next,
      },
    })
    completingId.value = null
    await refreshActivities()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not complete that activity.'
  }
}

async function addLine() {
  formError.value = ''
  try {
    await $fetch(`/api/opportunities/${id.value}/lines`, {
      method: 'POST',
      body: {
        offerId: lineOfferId.value ? Number(lineOfferId.value) : undefined,
        description: lineDescription.value || undefined,
        quantity: Number(lineQuantity.value || '1'),
        pricingType: lineType.value,
        unitPriceCents: linePrice.value ? Math.round(Number(linePrice.value) * 100) : undefined,
      },
    })
    lineDescription.value = ''
    linePrice.value = ''
    lineOfferId.value = ''
    await refreshLines()
    await refresh()
    await refreshProposal()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not add line.'
  }
}

function startEditLine(line: Line) {
  editingLineId.value = line.id
  editOfferId.value = line.offerId ? String(line.offerId) : ''
  editDescription.value = line.description
  editQuantity.value = String(line.quantity)
  editType.value = line.pricingType
  editPrice.value = (line.unitPriceCents / 100).toFixed(2)
}

function cancelEditLine() {
  editingLineId.value = null
}

function applyOfferToEdit() {
  const offer = offers.value?.find(row => String(row.id) === editOfferId.value)
  if (!offer) {
    return
  }
  editDescription.value = offer.name
  editType.value = offer.pricingType
  editPrice.value = (offer.defaultUnitPriceCents / 100).toFixed(2)
}

async function saveEditLine() {
  if (!editingLineId.value) {
    return
  }
  formError.value = ''
  try {
    await $fetch(`/api/opportunities/${id.value}/lines/${editingLineId.value}`, {
      method: 'PATCH',
      body: {
        offerId: editOfferId.value ? Number(editOfferId.value) : null,
        description: editDescription.value,
        quantity: Number(editQuantity.value || '1'),
        pricingType: editType.value,
        unitPriceCents: Math.round(Number(editPrice.value) * 100),
      },
    })
    editingLineId.value = null
    await refreshLines()
    await refresh()
    await refreshProposal()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save line.'
  }
}

async function removeLine(lineId: number) {
  await $fetch(`/api/opportunities/${id.value}/lines/${lineId}`, { method: 'DELETE' })
  if (editingLineId.value === lineId) {
    editingLineId.value = null
  }
  await refreshLines()
  await refresh()
  await refreshProposal()
}

async function runProposal(action: () => Promise<unknown>, success: string, selectCurrent = false) {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await action()
    await refreshProposal()
    if (selectCurrent && proposalBundle.value) {
      selectedRevisionId.value = proposalBundle.value.current.id
      applyRevisionToForm(proposalBundle.value.current)
    }
    notice.value = success
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Proposal action failed.'
  } finally {
    saving.value = false
  }
}

async function createDraftProposal() {
  await runProposal(
    () => callApi(`/api/opportunities/${id.value}/proposal`, { method: 'POST' }),
    'Draft Proposal created.',
    true,
  )
}

async function saveDraftProposal() {
  const bundle = proposalBundle.value
  if (!bundle) {
    return
  }
  await runProposal(
    () => callApi(`/api/proposals/${bundle.proposal.id}`, {
      method: 'PATCH',
      body: {
        title: proposalTitle.value,
        intro: proposalIntro.value || null,
        terms: proposalTerms.value || null,
        notes: proposalNotes.value || null,
        validThrough: proposalValidThrough.value || null,
        recipientContactId: proposalRecipientId.value ? Number(proposalRecipientId.value) : null,
      },
    }),
    'Draft saved.',
  )
}

async function issueCurrentProposal() {
  const bundle = proposalBundle.value
  if (!bundle) {
    return
  }
  await runProposal(
    () => callApi(`/api/proposals/${bundle.proposal.id}/issue`, { method: 'POST' }),
    'Proposal issued. Commercial terms are now a snapshot.',
    true,
  )
}

async function reviseProposal() {
  const bundle = proposalBundle.value
  if (!bundle) {
    return
  }
  await runProposal(
    () => callApi(`/api/proposals/${bundle.proposal.id}/revise`, { method: 'POST' }),
    'New Draft revision opened. The prior revision stays until this one is issued.',
    true,
  )
}

async function markProposalSent() {
  const bundle = proposalBundle.value
  if (!bundle) {
    return
  }
  await runProposal(
    () => callApi(`/api/proposals/${bundle.proposal.id}/mark-sent`, { method: 'POST' }),
    'Marked Sent. The CRM did not email anyone.',
  )
}

async function acceptCurrentProposal() {
  const bundle = proposalBundle.value
  if (!bundle) {
    return
  }
  await runProposal(
    () => callApi(`/api/proposals/${bundle.proposal.id}/accept`, { method: 'POST' }),
    'Proposal accepted. Opportunity Won was not changed.',
  )
}

async function declineCurrentProposal() {
  const bundle = proposalBundle.value
  if (!bundle) {
    return
  }
  await runProposal(
    () => callApi(`/api/proposals/${bundle.proposal.id}/decline`, { method: 'POST' }),
    'Proposal declined.',
  )
}

async function uploadSignedPdf(event: Event) {
  const bundle = proposalBundle.value
  const selected = selectedRevision.value
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!bundle || !selected || !file) {
    return
  }
  const body = new FormData()
  body.append('file', file)
  await runProposal(
    () => callApi(`/api/proposals/${bundle.proposal.id}/revisions/${selected.id}/signed`, {
      method: 'POST',
      body,
    }),
    'Signed PDF stored separately from the generated file.',
  )
  input.value = ''
}

function pickSignedPdf() {
  signedFileInput.value?.click()
}

function companyName() {
  return companies.value?.find(row => row.id === opportunity.value?.accountId)?.name
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !opportunity">
    <template #header>
      <p class="record-kind">
        Opportunity
      </p>
      <h1 class="record-identity-name">
        {{ opportunity?.name || 'Opportunity' }}
      </h1>
      <p
        v-if="opportunityHeaderStatus"
        class="record-status"
      >
        {{ opportunityHeaderStatus }}
      </p>
      <p class="record-meta">
        <NuxtLink
          v-if="opportunity"
          :to="`/companies/${opportunity.accountId}`"
        >
          {{ companyName() }}
        </NuxtLink>
        · {{ formatUsdFromCents(opportunity?.amountCents ?? 0) }} one-time
        · {{ formatUsdFromCents(opportunity?.mrrCents ?? 0) }} MRR
      </p>
      <p
        v-if="openActivities[0]"
        class="record-meta"
      >
        Next: {{ openActivities[0].description }}
      </p>
      <p
        v-else-if="opportunity && !terminal"
        class="record-meta"
      >
        No next action
      </p>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this opportunity.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <div
      v-if="opportunity"
      class="mb-4 flex flex-wrap gap-2"
    >
      <AppButton
        type="button"
        variant="secondary"
        @click="editingDetails = !editingDetails"
      >
        {{ editingDetails ? 'Hide details' : 'Edit details' }}
      </AppButton>
      <AppButton
        v-for="code in ACTIVE_OPPORTUNITY_STAGES"
        :key="code"
        type="button"
        variant="secondary"
        :disabled="terminal || opportunity.stage === code || saving"
        @click="save(code)"
      >
        {{ opportunityStageLabel(code) }}
      </AppButton>
    </div>
    <form
      v-if="opportunity && editingDetails"
      class="form-measure space-y-4"
      @submit.prevent="save()"
    >
      <AppField
        label="Name"
        required
      >
        <input
          v-model="name"
          class="control"
          required
        >
      </AppField>
      <AppField label="Primary contact">
        <select
          v-model="primaryContactId"
          class="control"
        >
          <option value="">
            None
          </option>
          <option
            v-for="contact in contacts"
            :key="contact.id"
            :value="String(contact.id)"
          >
            {{ contact.firstName }} {{ contact.lastName }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Current source"
      >
        <select
          v-model="sourceId"
          class="control"
        >
          <option value="">
            None
          </option>
          <option
            v-for="source in sources"
            :key="source.id"
            :value="String(source.id)"
          >
            {{ source.name }}
          </option>
        </select>
      </AppField>
      <AppField label="Current campaign">
        <select
          v-model="campaignId"
          class="control"
        >
          <option value="">
            None
          </option>
          <option
            v-for="item in campaigns"
            :key="item.id"
            :value="String(item.id)"
          >
            {{ item.name }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Source detail"
        hint="Required when Source is Other"
      >
        <input
          v-model="sourceDetail"
          class="control"
        >
      </AppField>
      <p
        v-if="opportunity.capturedSourceName || opportunity.capturedTrackingLinkLabel"
        class="text-sm text-muted"
      >
        Original captured:
        {{ opportunity.capturedSourceName || 'No source' }}
        · {{ opportunity.capturedCampaignName || 'No campaign' }}
        <span v-if="opportunity.capturedTrackingLinkLabel">
          · {{ opportunity.capturedTrackingLinkLabel }}
        </span>
      </p>
      <p class="text-sm">
        One-time {{ formatUsdFromCents(opportunity.amountCents ?? 0) }}
        · MRR {{ formatUsdFromCents(opportunity.mrrCents ?? 0) }}
        (from lines; quantity × monthly unit price)
      </p>
      <AppField label="Owner">
        <select
          v-model="ownerUserId"
          class="control"
        >
          <option
            v-for="person in assignees"
            :key="person.id"
            :value="String(person.id)"
          >
            {{ person.displayName }}
          </option>
        </select>
      </AppField>
      <AppField label="Notes">
        <textarea
          v-model="notes"
          class="control"
          rows="3"
        />
      </AppField>
      <div class="flex flex-wrap gap-2">
        <AppButton
          type="submit"
          :loading="saving"
        >
          Save
        </AppButton>
      </div>
    </form>
    <div
      v-if="opportunity && !terminal"
      class="form-measure mt-6 space-y-3"
    >
      <p class="text-sm text-muted">
        Won means a signed agreement / SOW. Staff-asserted. Not invoice, payment, or kickoff.
      </p>
      <AppButton
        :loading="saving"
        @click="requestWon"
      >
        Mark Won
      </AppButton>
      <AppField label="Lost reason">
        <select
          v-model="lossReason"
          class="control"
        >
          <option
            v-for="reason in LOSS_REASONS"
            :key="reason"
            :value="reason"
          >
            {{ lossReasonLabel(reason) }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Lost notes"
        hint="Required when reason is Other"
      >
        <textarea
          v-model="lossNotes"
          class="control"
          rows="2"
        />
      </AppField>
      <AppButton
        variant="secondary"
        :loading="saving"
        @click="requestLost"
      >
        Mark Lost
      </AppButton>
      <div
        v-if="confirmClose"
        class="rounded-md border border-navy-600/15 p-3 space-y-3"
      >
        <p class="text-sm">
          {{ openActivities.length }} open {{ openActivities.length === 1 ? 'activity remains' : 'activities remain' }}.
          Cancel them so they leave the daily queue? Completed history is kept. Reopen will not restore cancelled tasks.
        </p>
        <label class="touch-row">
          <input
            v-model="cancelOpenOnClose"
            type="checkbox"
          >
          Cancel remaining open activities (recommended)
        </label>
        <div class="flex flex-wrap gap-2">
          <AppButton
            :loading="saving"
            @click="confirmClose === 'won' ? markWon() : markLost()"
          >
            Confirm {{ confirmClose === 'won' ? 'Won' : 'Lost' }}
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            @click="confirmClose = null"
          >
            Back
          </AppButton>
        </div>
      </div>
    </div>
    <div
      v-else-if="opportunity && terminal"
      class="form-measure mt-6 space-y-3"
    >
      <p class="text-sm">
        Terminal: {{ opportunityStageLabel(opportunity.stage) }}
        <span v-if="opportunity.lossReason">
          · {{ lossReasonLabel(opportunity.lossReason) }}
        </span>
      </p>
      <AppButton
        :loading="saving"
        @click="reopen"
      >
        Reopen
      </AppButton>
      <div
        v-if="opportunity.stage === 'won' && handoff"
        class="rounded-md border border-navy-600/15 p-3 space-y-2"
      >
        <p class="text-sm font-semibold">
          The sale is complete. Now serve the customer.
        </p>
        <p class="text-sm">
          {{ handoff.companyName }}
          · {{ formatUsdFromCents(handoff.oneTimeCents) }} one-time
          · {{ formatUsdFromCents(handoff.mrrCents) }} MRR
        </p>
        <p
          v-if="handoff.primaryContact"
          class="text-sm"
        >
          Primary contact: {{ handoff.primaryContact.name }}
          <span v-if="handoff.primaryContact.email">
            · {{ handoff.primaryContact.email }}
          </span>
        </p>
        <ul class="text-sm space-y-1">
          <li
            v-for="line in handoff.lines"
            :key="line.description"
          >
            {{ line.description }}
            · {{ line.pricingType === 'monthly' ? 'Monthly' : 'One-time' }}
            · {{ formatUsdFromCents(line.unitPriceCents) }}
          </li>
        </ul>
        <ol class="list-decimal pl-5 text-sm space-y-1">
          <li
            v-for="step in handoff.nextSteps"
            :key="step"
          >
            {{ step }}
          </li>
        </ol>
      </div>
    </div>
    <template #tabs>
      <div
        v-if="opportunity"
        class="mt-8 space-y-6"
      >
        <p
          v-if="opportunity.sourceLeadId"
          class="text-sm"
        >
          <NuxtLink :to="`/leads/${opportunity.sourceLeadId}`">
            Source Lead
          </NuxtLink>
        </p>
        <AppPanel title="Proposal">
          <div
            v-if="!proposalBundle"
            class="space-y-3"
          >
            <p class="text-sm text-muted">
              One Proposal chain per Opportunity. Create a Draft, then Issue to freeze a snapshot and PDF.
            </p>
            <AppButton
              :loading="saving"
              @click="createDraftProposal"
            >
              Create Draft Proposal
            </AppButton>
          </div>
          <div
            v-else-if="selectedRevision"
            class="space-y-4"
          >
            <p class="text-sm">
              {{ formatProposalLabel(proposalBundle.proposal.proposalNumber, selectedRevision.revision) }}
              · {{ proposalStatusDisplay(selectedRevision.status, selectedRevision.sentAt) }}
              <span
                v-if="selectedPastValidThrough"
                class="text-red-800"
              >· Past valid-through</span>
            </p>
            <ul class="space-y-1">
              <li
                v-for="revision in proposalBundle.revisions"
                :key="revision.id"
              >
                <button
                  type="button"
                  class="w-full rounded-md px-2.5 py-1.5 text-left text-sm"
                  :class="selectedRevision.id === revision.id ? 'bg-brand-50 font-semibold text-navy-900' : 'text-muted hover:bg-canvas'"
                  :aria-current="selectedRevision.id === revision.id ? 'true' : undefined"
                  @click="selectProposalRevision(revision.id)"
                >
                  r{{ revision.revision }}
                  · {{ proposalStatusDisplay(revision.status, revision.sentAt) }}
                  <span
                    v-if="revision.id === proposalBundle.current.id"
                    class="text-muted"
                  >· Current</span>
                </button>
              </li>
            </ul>
            <form
              v-if="selectedRevision.status === 'draft'"
              class="space-y-3"
              @submit.prevent="saveDraftProposal"
            >
              <AppField
                label="Title"
                required
              >
                <input
                  v-model="proposalTitle"
                  class="control"
                  required
                >
              </AppField>
              <AppField label="Recipient">
                <select
                  v-model="proposalRecipientId"
                  class="control"
                >
                  <option value="">
                    None
                  </option>
                  <option
                    v-for="contact in contacts"
                    :key="contact.id"
                    :value="String(contact.id)"
                  >
                    {{ contact.firstName }} {{ contact.lastName }}
                  </option>
                </select>
              </AppField>
              <AppField label="Intro / scope">
                <textarea
                  v-model="proposalIntro"
                  class="control"
                  rows="3"
                />
              </AppField>
              <AppField label="Terms / legal (override instance default)">
                <textarea
                  v-model="proposalTerms"
                  class="control"
                  rows="4"
                />
              </AppField>
              <AppField label="Notes">
                <textarea
                  v-model="proposalNotes"
                  class="control"
                  rows="2"
                />
              </AppField>
              <AppField
                label="Valid through"
                hint="Optional. Past dates are labeled only; status does not auto-change."
              >
                <input
                  v-model="proposalValidThrough"
                  class="control"
                  type="date"
                >
              </AppField>
              <AppButton
                type="submit"
                :loading="saving"
              >
                Save Draft
              </AppButton>
            </form>
            <p
              v-else
              class="text-sm text-muted"
            >
              Issued proposals are immutable. Create a new revision to make changes.
              This snapshot: {{ formatUsdFromCents(selectedRevision.amountCents) }} one-time
              · {{ formatUsdFromCents(selectedRevision.mrrCents) }} MRR.
            </p>
            <div class="flex flex-wrap gap-2">
              <NuxtLink
                class="btn-secondary"
                :to="`/proposals/${proposalBundle.proposal.id}/r/${selectedRevision.id}`"
              >
                Preview
              </NuxtLink>
              <a
                v-if="canUploadSignedProposal(selectedRevision.status)"
                class="btn-secondary"
                :href="`/api/proposals/${proposalBundle.proposal.id}/revisions/${selectedRevision.id}/pdf`"
              >
                Download PDF
              </a>
              <AppButton
                v-if="selectedRevision.status === 'draft'"
                :loading="saving"
                @click="issueCurrentProposal"
              >
                Issue
              </AppButton>
              <AppButton
                v-if="canRecordIssuedProposalActions(selectedRevision.status, selectedRevision.id, proposalBundle.current.id)"
                variant="secondary"
                :loading="saving"
                @click="markProposalSent"
              >
                Mark Sent
              </AppButton>
              <AppButton
                v-if="canRecordIssuedProposalActions(selectedRevision.status, selectedRevision.id, proposalBundle.current.id)"
                variant="secondary"
                :loading="saving"
                @click="acceptCurrentProposal"
              >
                Record Accepted
              </AppButton>
              <AppButton
                v-if="canRecordIssuedProposalActions(selectedRevision.status, selectedRevision.id, proposalBundle.current.id)"
                variant="subtle"
                :loading="saving"
                @click="declineCurrentProposal"
              >
                Record Declined
              </AppButton>
              <AppButton
                v-if="canCreateProposalRevision(proposalBundle.current.status)"
                variant="secondary"
                :loading="saving"
                @click="reviseProposal"
              >
                New revision
              </AppButton>
            </div>
            <div
              v-if="canUploadSignedProposal(selectedRevision.status)"
              class="space-y-2"
            >
              <input
                ref="signedFileInput"
                class="sr-only"
                type="file"
                accept="application/pdf"
                @change="uploadSignedPdf"
              >
              <AppButton
                variant="secondary"
                :loading="saving"
                @click="pickSignedPdf"
              >
                Upload Signed PDF
              </AppButton>
              <p
                v-if="selectedRevision.signedPdfPath"
                class="text-sm"
              >
                Signed PDF on file{{ selectedRevision.signedPdfOriginalName ? `: ${selectedRevision.signedPdfOriginalName}` : '.' }}
              </p>
              <div
                v-if="selectedRevision.signedPdfPath"
                class="flex flex-wrap gap-2"
              >
                <a
                  class="btn btn-secondary"
                  :href="`/api/proposals/${proposalBundle.proposal.id}/revisions/${selectedRevision.id}/signed?view=1`"
                  target="_blank"
                  rel="noopener"
                >
                  View Signed PDF
                </a>
                <a
                  class="btn btn-secondary"
                  :href="`/api/proposals/${proposalBundle.proposal.id}/revisions/${selectedRevision.id}/signed`"
                >
                  Download Signed PDF
                </a>
              </div>
            </div>
          </div>
        </AppPanel>
        <AppPanel title="Commercial lines">
          <form
            class="mb-4 grid gap-2 sm:grid-cols-2"
            @submit.prevent="addLine"
          >
            <AppField label="Offer">
              <select
                v-model="lineOfferId"
                class="control"
              >
                <option value="">
                  Custom line
                </option>
                <option
                  v-for="offer in offers"
                  :key="offer.id"
                  :value="String(offer.id)"
                >
                  {{ offer.name }}
                </option>
              </select>
            </AppField>
            <AppField label="Description">
              <input
                v-model="lineDescription"
                class="control"
              >
            </AppField>
            <AppField label="Qty">
              <input
                v-model="lineQuantity"
                class="control"
                type="number"
                min="1"
              >
            </AppField>
            <AppField label="Type">
              <select
                v-model="lineType"
                class="control"
              >
                <option
                  v-for="type in OFFER_PRICING_TYPES"
                  :key="type"
                  :value="type"
                >
                  {{ offerPricingTypeLabel(type) }}
                </option>
              </select>
            </AppField>
            <AppField label="Quoted unit price (USD)">
              <input
                v-model="linePrice"
                class="control"
                inputmode="decimal"
              >
            </AppField>
            <div class="self-end">
              <AppButton type="submit">
                Add line
              </AppButton>
            </div>
          </form>
          <ul class="space-y-2 text-sm">
            <li
              v-for="line in lines"
              :key="line.id"
              class="space-y-2 rounded-md border border-line p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {{ line.quantity }} × {{ line.description }}
                  · {{ offerPricingTypeLabel(line.pricingType) }}
                  · {{ formatUsdFromCents(line.unitPriceCents) }}
                </span>
                <div class="flex flex-wrap gap-2">
                  <AppButton
                    v-if="editingLineId !== line.id"
                    variant="subtle"
                    @click="startEditLine(line)"
                  >
                    Edit
                  </AppButton>
                  <AppButton
                    variant="subtle"
                    @click="removeLine(line.id)"
                  >
                    Remove
                  </AppButton>
                </div>
              </div>
              <form
                v-if="editingLineId === line.id"
                class="grid gap-2 sm:grid-cols-2"
                @submit.prevent="saveEditLine"
              >
                <AppField label="Offer">
                  <select
                    v-model="editOfferId"
                    class="control"
                    @change="applyOfferToEdit"
                  >
                    <option value="">
                      Custom line
                    </option>
                    <option
                      v-for="offer in offers"
                      :key="offer.id"
                      :value="String(offer.id)"
                    >
                      {{ offer.name }}
                    </option>
                  </select>
                </AppField>
                <AppField label="Description">
                  <input
                    v-model="editDescription"
                    class="control"
                    required
                  >
                </AppField>
                <AppField label="Qty">
                  <input
                    v-model="editQuantity"
                    class="control"
                    type="number"
                    min="1"
                    required
                  >
                </AppField>
                <AppField label="Type">
                  <select
                    v-model="editType"
                    class="control"
                  >
                    <option
                      v-for="type in OFFER_PRICING_TYPES"
                      :key="type"
                      :value="type"
                    >
                      {{ offerPricingTypeLabel(type) }}
                    </option>
                  </select>
                </AppField>
                <AppField label="Quoted unit price (USD)">
                  <input
                    v-model="editPrice"
                    class="control"
                    inputmode="decimal"
                    required
                  >
                </AppField>
                <div class="flex flex-wrap items-end gap-2">
                  <AppButton type="submit">
                    Save line
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="secondary"
                    @click="cancelEditLine"
                  >
                    Cancel
                  </AppButton>
                </div>
              </form>
            </li>
          </ul>
        </AppPanel>
        <AppPanel title="Activities">
          <form
            class="mb-3 grid gap-2 sm:grid-cols-2"
            @submit.prevent="addActivity"
          >
            <input
              v-model="activityDescription"
              class="control sm:col-span-2"
              placeholder="Call owner"
              required
            >
            <select
              v-model="activityType"
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
            <input
              v-model="activityDue"
              class="control"
              type="datetime-local"
              required
            >
            <div class="sm:col-span-2">
              <AppButton type="submit">
                Add activity
              </AppButton>
            </div>
          </form>
          <ul class="space-y-3 text-sm">
            <li
              v-for="activity in activities"
              :key="activity.id"
            >
              <p>
                {{ activity.description }}
                <span class="text-muted">
                  · {{ activityTypeLabel(activity.type) }}
                  · {{ activity.status }}
                  · {{ activity.dueAt ? new Date(activity.dueAt).toLocaleString() : 'No due date' }}
                  <span v-if="activity.outcome">
                    · {{ activityOutcomeLabel(activity.outcome) }}
                  </span>
                </span>
              </p>
              <AppButton
                v-if="activity.status === 'open'"
                class="mt-1"
                variant="secondary"
                @click="completingId = completingId === activity.id ? null : activity.id"
              >
                {{ completingId === activity.id ? 'Close' : 'Complete' }}
              </AppButton>
              <SalesActivityComplete
                v-if="completingId === activity.id"
                :activity-type="activity.type"
                @cancel="completingId = null"
                @complete="payload => completeActivity(activity, payload)"
              />
            </li>
          </ul>
        </AppPanel>
        <SalesHistory
          record-kind="opportunity"
          :record-id="opportunity.id"
        />
      </div>
    </template>
  </AppRecordWorkspace>
</template>
