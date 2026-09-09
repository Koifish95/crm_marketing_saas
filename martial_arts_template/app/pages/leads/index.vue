<script setup lang="ts">
import {
  HOUSEHOLD_STATUS_FILTERS,
  LEAD_SOURCES,
  householdDisplayStatus,
  householdProgramSummary,
  householdProspectLabel,
  householdStatusFilterLabel,
  personName,
  sourceLabel,
} from '#shared/utils/labels'
import { toBusinessDateTime } from '#shared/utils/time'
import { leadStaffPath } from '#shared/utils/lead'
import type { LeadRecord } from '#shared/types/crm'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'crm'],
})

useHead({
  title: 'Leads',
})

const { user } = useUserSession()
const canWrite = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'STAFF')

const route = useRoute()
const search = ref('')
const status = ref('')
const programId = ref('')
const source = ref('')
const campaignId = ref(typeof route.query.campaignId === 'string' ? route.query.campaignId : '')
const view = ref<'list' | 'board'>('list')

watch(
  () => route.query.campaignId,
  (value) => {
    campaignId.value = typeof value === 'string' ? value : ''
  },
)

const query = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  programId: programId.value || undefined,
  source: source.value || undefined,
  campaignId: campaignId.value || undefined,
}))

const { data: leads, pending, refresh } = await useFetch<LeadRecord[]>('/api/leads', { query })
const { data: programs } = await useFetch('/api/programs')
const { data: campaigns } = await useFetch('/api/campaigns')

const households = computed(() => (leads.value ?? []).map((lead) => {
  const display = householdDisplayStatus(lead)
  const lines = lead.lines ?? []
  return {
    lead,
    display,
    prospectLabel: householdProspectLabel(lines.length),
    programsLabel: householdProgramSummary(lines, lead.program),
    nextIntro: nextIntroLabel(lead),
  }
}))

function householdHref(leadId: number) {
  return leadStaffPath(leadId, {
    search: search.value,
    status: status.value,
    programId: programId.value,
    source: source.value,
    campaignId: campaignId.value,
  })
}

function nextIntroLabel(lead: LeadRecord) {
  if (!lead.nextTrial) {
    return '—'
  }
  const when = toBusinessDateTime(new Date(lead.nextTrial.scheduledAt).getTime())
  if ((lead.lines?.length ?? 0) > 1 && lead.nextTrial.personName) {
    return `${when} · ${lead.nextTrial.personName}`
  }
  return when
}

function leadsInStatus(value: string) {
  return households.value.filter(household => household.display.key === value)
}

const filtersOpen = ref(false)
const activeFilterCount = computed(() => [status.value, programId.value, source.value, campaignId.value].filter(Boolean).length)
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Leads"
      description="Each row is a household. Search, filter, and work the pipeline."
    >
      <template #actions>
        <button
          type="button"
          class="btn btn-secondary"
          @click="view = view === 'list' ? 'board' : 'list'"
        >
          {{ view === 'list' ? 'Pipeline' : 'List' }}
        </button>
        <NuxtLink
          v-if="canWrite"
          to="/leads/new"
          class="btn btn-primary"
        >
          New lead
        </NuxtLink>
      </template>
    </AppPageHeader>

    <div class="space-y-3">
      <div class="flex gap-2">
        <label
          class="sr-only"
          for="lead-search"
        >Search households</label>
        <input
          id="lead-search"
          v-model="search"
          type="search"
          placeholder="Search contact or person, phone, email"
          class="control min-w-0 flex-1"
          @keydown.enter.prevent="refresh()"
        >
        <button
          type="button"
          class="btn btn-secondary shrink-0 md:hidden"
          @click="filtersOpen = true"
        >
          Filters{{ activeFilterCount ? ` (${activeFilterCount})` : '' }}
        </button>
      </div>
      <div
        v-if="activeFilterCount"
        class="flex flex-wrap gap-2 text-xs md:hidden"
      >
        <span
          v-if="status"
          class="rounded-md bg-canvas px-2 py-1 text-muted"
        >{{ householdStatusFilterLabel(status) }}</span>
        <span
          v-if="source"
          class="rounded-md bg-canvas px-2 py-1 text-muted"
        >{{ sourceLabel(source) }}</span>
      </div>
      <form
        class="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-4"
        @submit.prevent="refresh()"
      >
        <select
          v-model="status"
          class="control"
          aria-label="Household status"
        >
          <option value="">
            All statuses
          </option>
          <option
            v-for="item in HOUSEHOLD_STATUS_FILTERS"
            :key="item"
            :value="item"
          >
            {{ householdStatusFilterLabel(item) }}
          </option>
        </select>
        <select
          v-model="programId"
          class="control"
          aria-label="Program"
        >
          <option value="">
            All programs
          </option>
          <option
            v-for="program in programs"
            :key="program.id"
            :value="program.id"
          >
            {{ program.name }}
          </option>
        </select>
        <select
          v-model="source"
          class="control"
          aria-label="Source"
        >
          <option value="">
            All sources
          </option>
          <option
            v-for="item in LEAD_SOURCES"
            :key="item"
            :value="item"
          >
            {{ sourceLabel(item) }}
          </option>
        </select>
        <select
          v-model="campaignId"
          class="control"
          aria-label="Campaign"
        >
          <option value="">
            All campaigns
          </option>
          <option
            v-for="campaign in campaigns"
            :key="campaign.id"
            :value="String(campaign.id)"
          >
            {{ campaign.name }}
          </option>
        </select>
      </form>
    </div>

    <AppFilterSheet
      v-model:open="filtersOpen"
      title="Lead filters"
    >
      <div class="space-y-3">
        <select
          v-model="status"
          class="control"
          aria-label="Household status"
        >
          <option value="">
            All statuses
          </option>
          <option
            v-for="item in HOUSEHOLD_STATUS_FILTERS"
            :key="item"
            :value="item"
          >
            {{ householdStatusFilterLabel(item) }}
          </option>
        </select>
        <select
          v-model="programId"
          class="control"
          aria-label="Program"
        >
          <option value="">
            All programs
          </option>
          <option
            v-for="program in programs"
            :key="program.id"
            :value="program.id"
          >
            {{ program.name }}
          </option>
        </select>
        <select
          v-model="source"
          class="control"
          aria-label="Source"
        >
          <option value="">
            All sources
          </option>
          <option
            v-for="item in LEAD_SOURCES"
            :key="item"
            :value="item"
          >
            {{ sourceLabel(item) }}
          </option>
        </select>
        <select
          v-model="campaignId"
          class="control"
          aria-label="Campaign"
        >
          <option value="">
            All campaigns
          </option>
          <option
            v-for="campaign in campaigns"
            :key="campaign.id"
            :value="String(campaign.id)"
          >
            {{ campaign.name }}
          </option>
        </select>
      </div>
    </AppFilterSheet>

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      Loading leads…
    </p>

    <template v-else-if="view === 'list'">
      <AppEmpty
        v-if="!households.length"
        title="No leads yet"
        description="Book an intro or add a walk-in to start the pipeline."
      />
      <div
        v-else
        class="space-y-3 md:hidden"
      >
        <div
          v-for="household in households"
          :key="household.lead.id"
          class="panel p-5"
        >
          <div class="flex min-w-0 flex-wrap items-start gap-2">
            <NuxtLink
              :to="householdHref(household.lead.id)"
              class="min-w-0 break-words font-semibold text-navy-900 hover:text-brand-700"
            >
              {{ personName(household.lead) }}
            </NuxtLink>
            <AppBadge
              v-if="household.lead.possibleDuplicateMatches?.length"
              class="shrink-0"
              tone="warning"
            >
              Possible duplicate
            </AppBadge>
            <AppBadge
              class="ml-auto shrink-0"
              :tone="household.display.tone"
            >
              {{ household.display.label }}
            </AppBadge>
          </div>
          <p class="mt-1 text-sm text-muted">
            {{ household.prospectLabel }} · {{ household.programsLabel || '—' }}
          </p>
          <p class="mt-1 text-sm text-ink">
            <a
              v-if="household.lead.phone"
              :href="`tel:${household.lead.phone}`"
              class="inline-flex min-h-11 items-center font-medium text-navy-800 hover:text-brand-700"
            >{{ household.lead.phone }}</a>
            <span v-else>{{ household.lead.email || 'No contact' }}</span>
          </p>
          <p class="mt-1 text-xs text-muted">
            {{ sourceLabel(household.lead.source) }}
          </p>
          <p class="mt-1 text-xs text-muted">
            Next intro: {{ household.nextIntro }}
          </p>
        </div>
      </div>
      <div
        v-if="households.length"
        class="panel hidden overflow-x-auto md:block"
      >
        <table class="data-table">
          <thead class="border-b border-line bg-canvas text-muted">
            <tr>
              <th class="px-4 py-3 font-medium">
                Contact
              </th>
              <th class="px-4 py-3 font-medium">
                Prospects
              </th>
              <th class="px-4 py-3 font-medium">
                Programs
              </th>
              <th class="px-4 py-3 font-medium">
                Phone
              </th>
              <th class="px-4 py-3 font-medium">
                Source
              </th>
              <th class="px-4 py-3 font-medium">
                Household status
              </th>
              <th class="px-4 py-3 font-medium">
                Next intro
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="household in households"
              :key="household.lead.id"
              class="border-t border-line hover:bg-canvas/70"
            >
              <td class="min-w-0 px-4 py-3">
                <NuxtLink
                  :to="householdHref(household.lead.id)"
                  class="break-words font-medium text-navy-900 hover:text-brand-700"
                >
                  {{ personName(household.lead) }}
                </NuxtLink>
                <AppBadge
                  v-if="household.lead.possibleDuplicateMatches?.length"
                  class="mt-1"
                  tone="warning"
                >
                  Possible duplicate
                </AppBadge>
                <p
                  v-if="household.lead.email"
                  class="text-xs text-muted"
                >
                  {{ household.lead.email }}
                </p>
              </td>
              <td class="px-4 py-3 text-muted">
                {{ household.prospectLabel }}
              </td>
              <td class="px-4 py-3 text-muted">
                {{ household.programsLabel || '—' }}
              </td>
              <td class="px-4 py-3">
                {{ household.lead.phone || '—' }}
              </td>
              <td class="px-4 py-3 text-muted">
                {{ sourceLabel(household.lead.source) }}
              </td>
              <td class="px-4 py-3">
                <AppBadge :tone="household.display.tone">
                  {{ household.display.label }}
                </AppBadge>
              </td>
              <td class="px-4 py-3 text-muted">
                {{ household.nextIntro }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div
      v-else
      class="flex gap-3 overflow-x-auto pb-4"
    >
      <div
        v-for="column in HOUSEHOLD_STATUS_FILTERS"
        :key="column"
        class="w-64 shrink-0 panel p-3"
      >
        <h2 class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
          <span>{{ householdStatusFilterLabel(column) }}</span>
          <span>{{ leadsInStatus(column).length }}</span>
        </h2>
        <p
          v-if="!leadsInStatus(column).length"
          class="mt-3 text-sm text-muted"
        >
          None
        </p>
        <NuxtLink
          v-for="household in leadsInStatus(column)"
          :key="household.lead.id"
          :to="householdHref(household.lead.id)"
          class="mt-2 block rounded-md border border-line bg-paper p-2.5 text-sm hover:border-navy-600/40"
        >
          <p class="flex flex-wrap items-center gap-2 font-medium text-navy-900">
            <span>{{ personName(household.lead) }}</span>
            <AppBadge
              v-if="household.lead.possibleDuplicateMatches?.length"
              tone="warning"
            >
              Possible duplicate
            </AppBadge>
          </p>
          <p class="text-muted">
            {{ household.prospectLabel }} · {{ household.programsLabel || '—' }}
          </p>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
