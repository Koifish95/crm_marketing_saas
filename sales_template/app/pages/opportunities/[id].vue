<script setup lang="ts">
import {
  ACTIVE_OPPORTUNITY_STAGES,
  LOSS_REASONS,
  isTerminalOpportunityStage,
  lossReasonLabel,
  opportunityStageLabel,
  type OpportunityStage,
} from '#shared/utils/pipeline'
import { formatUsdFromCents } from '#shared/utils/money'
import { OFFER_PRICING_TYPES, offerPricingTypeLabel } from '#shared/utils/catalog'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Company = { id: number, name: string }
type Contact = { id: number, accountId: number, firstName: string, lastName: string }
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
type Activity = { id: number, description: string, status: string }

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
const lineDescription = ref('')
const lineQuantity = ref('1')
const linePrice = ref('')
const lineType = ref('one_time')
const lineOfferId = ref('')
const saving = ref(false)
const notice = ref('')
const formError = ref('')

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

const terminal = computed(() => opportunity.value ? isTerminalOpportunityStage(opportunity.value.stage) : false)

async function save(nextStage?: 'proposal_quote' | 'decision') {
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

async function markWon() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/opportunities/${id.value}/won`, { method: 'POST' })
    await refresh()
    notice.value = 'Marked Won (signed agreement / SOW).'
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
      body: { lossReason: lossReason.value, lossNotes: lossNotes.value || undefined },
    })
    await refresh()
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
      body: { opportunityId: id.value, description: activityDescription.value, type: 'task' },
    })
    activityDescription.value = ''
    await refreshActivities()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not add activity.'
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
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not add line.'
  }
}

async function removeLine(lineId: number) {
  await $fetch(`/api/opportunities/${id.value}/lines/${lineId}`, { method: 'DELETE' })
  await refreshLines()
  await refresh()
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
      <p class="record-meta">
        {{ opportunity ? opportunityStageLabel(opportunity.stage) : '' }}
        ·
        <NuxtLink
          v-if="opportunity"
          :to="`/companies/${opportunity.accountId}`"
        >
          {{ companyName() }}
        </NuxtLink>
        · {{ formatUsdFromCents(opportunity?.amountCents ?? 0) }} one-time
        · {{ formatUsdFromCents(opportunity?.mrrCents ?? 0) }} MRR
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
    <form
      v-if="opportunity"
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
        @click="markWon"
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
        @click="markLost"
      >
        Mark Lost
      </AppButton>
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
              class="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {{ line.quantity }} × {{ line.description }}
                · {{ offerPricingTypeLabel(line.pricingType) }}
                · {{ formatUsdFromCents(line.unitPriceCents) }}
              </span>
              <AppButton
                variant="subtle"
                @click="removeLine(line.id)"
              >
                Remove
              </AppButton>
            </li>
          </ul>
        </AppPanel>
        <AppPanel title="Activities">
          <form
            class="mb-3 flex gap-2"
            @submit.prevent="addActivity"
          >
            <input
              v-model="activityDescription"
              class="control flex-1"
              placeholder="Follow-up"
              required
            >
            <AppButton type="submit">
              Add
            </AppButton>
          </form>
          <ul class="space-y-2 text-sm">
            <li
              v-for="activity in activities"
              :key="activity.id"
            >
              {{ activity.description }}
              <span class="text-muted">
                · {{ activity.status }}
              </span>
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
