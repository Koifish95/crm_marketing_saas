<script setup lang="ts">
import { centsToDollarString } from '#shared/utils/money'
import { denverYmd } from '#shared/utils/time'
import { LEAD_SOURCES, sourceLabel } from '#shared/utils/labels'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'crm'],
})

useHead({
  title: 'Reports',
})

const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'ADMIN')

const today = denverYmd(Date.now())
const fromYmd = ref(`${today.slice(0, 7)}-01`)
const toYmd = ref(today)
const programId = ref('')
const source = ref('')
const campaignId = ref('')

const query = computed(() => ({
  fromYmd: fromYmd.value,
  toYmd: toYmd.value,
  programId: programId.value || undefined,
  source: source.value || undefined,
  campaignId: campaignId.value || undefined,
}))

const { data, pending, error, refresh } = await useFetch('/api/reports', { query })
const { data: programs } = await useFetch('/api/programs')
const { data: campaigns } = await useFetch('/api/campaigns')
const metaReport = ref<{
  campaigns: Array<{
    name: string
    status: string | null
    mapped: Array<{ name: string }>
    metaReported: { spendCents: number, impressions: number, clicks: number, leadsCount: number, ctr: number }
    internalMapped: { households: number, conversions: number, newMrrCents: number }
  }>
} | null>(null)

watch([query, isAdmin], async () => {
  if (!isAdmin.value) {
    metaReport.value = null
    return
  }
  try {
    const params = new URLSearchParams()
    params.set('fromYmd', query.value.fromYmd)
    params.set('toYmd', query.value.toYmd)
    if (query.value.programId) {
      params.set('programId', query.value.programId)
    }
    if (query.value.source) {
      params.set('source', query.value.source)
    }
    if (query.value.campaignId) {
      params.set('campaignId', query.value.campaignId)
    }
    const response = await fetch(`/api/reports/meta?${params.toString()}`)
    if (!response.ok) {
      metaReport.value = null
      return
    }
    metaReport.value = await response.json()
  } catch {
    metaReport.value = null
  }
}, { immediate: true })

function pct(value: number | undefined) {
  return `${Math.round((value ?? 0) * 1000) / 10}%`
}

function exportHref(kind: 'leads' | 'conversions' | 'campaigns' | 'meta') {
  const params = new URLSearchParams()
  params.set('kind', kind)
  params.set('fromYmd', fromYmd.value)
  params.set('toYmd', toYmd.value)
  if (programId.value) {
    params.set('programId', programId.value)
  }
  if (source.value) {
    params.set('source', source.value)
  }
  if (campaignId.value) {
    params.set('campaignId', campaignId.value)
  }
  return `/api/reports/export?${params.toString()}`
}

function dollars(cents: number | undefined) {
  return `$${centsToDollarString(cents ?? 0)}`
}

const filtersOpen = ref(false)
const showFullTables = ref(false)
const activeFilterCount = computed(() => [programId.value, source.value, campaignId.value].filter(Boolean).length)
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Reports"
      description="Household volume and unique prospective-member funnel for the selected Denver calendar range."
    />

    <div class="space-y-3">
      <form
        class="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5"
        @submit.prevent="refresh()"
      >
        <label class="text-sm">
          From
          <input
            v-model="fromYmd"
            type="date"
            class="control mt-1"
          >
        </label>
        <label class="text-sm">
          To
          <input
            v-model="toYmd"
            type="date"
            class="control mt-1"
          >
        </label>
        <select
          v-model="programId"
          class="control hidden self-end md:block"
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
          class="control hidden self-end md:block"
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
          class="control hidden self-end md:block"
          aria-label="Campaign"
        >
          <option value="">
            All campaigns
          </option>
          <option
            v-for="campaign in campaigns"
            :key="campaign.id"
            :value="campaign.id"
          >
            {{ campaign.name }}
          </option>
        </select>
        <div class="sm:col-span-2 md:hidden">
          <button
            type="button"
            class="btn btn-secondary w-full"
            @click="filtersOpen = true"
          >
            Filters{{ activeFilterCount ? ` (${activeFilterCount})` : '' }}
          </button>
        </div>
      </form>
    </div>

    <AppFilterSheet
      v-model:open="filtersOpen"
      title="Report filters"
    >
      <div class="space-y-3">
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
            :value="campaign.id"
          >
            {{ campaign.name }}
          </option>
        </select>
      </div>
    </AppFilterSheet>

    <div class="flex flex-wrap gap-2">
      <a
        class="btn btn-secondary text-sm"
        :href="exportHref('leads')"
      >CSV: households / people</a>
      <a
        class="btn btn-secondary text-sm"
        :href="exportHref('conversions')"
      >CSV: conversions</a>
      <a
        class="btn btn-secondary text-sm"
        :href="exportHref('campaigns')"
      >CSV: campaigns</a>
      <a
        v-if="isAdmin"
        class="btn btn-secondary text-sm"
        :href="exportHref('meta')"
      >CSV: Meta</a>
    </div>

    <AppAlert v-if="error">
      Could not load reports. Check the date range and try again.
    </AppAlert>
    <p
      v-else-if="pending && !data"
      class="text-sm text-muted"
    >
      Loading reports…
    </p>

    <template v-else-if="data">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AppStat
          label="Households"
          hint="Lead headers created in range"
        >
          {{ data.households }}
        </AppStat>
        <AppStat
          label="Prospective members"
          hint="Unique people, not trial rows"
        >
          {{ data.prospectiveMembers }}
        </AppStat>
        <AppStat
          label="Conversions"
          hint="Joined in this date range"
        >
          {{ data.conversions.count }}
        </AppStat>
        <AppStat
          v-if="data.includeFinancial"
          label="New converted MRR"
          hint="Conversion snapshots, not pipeline forecast or cash"
        >
          {{ dollars(data.conversions.newMrrCents) }}
        </AppStat>
        <AppStat
          v-else
          label="Lost"
          hint="Lost outcomes in range"
        >
          {{ data.lost.count }}
        </AppStat>
      </div>

      <AppPanel
        title="Person funnel"
        description="Unique LeadLines. Reschedules do not add people."
      >
        <dl class="panel-list grid gap-3 sm:grid-cols-4">
          <div>
            <dt class="text-sm text-muted">
              Prospective members
            </dt>
            <dd class="font-display text-xl font-semibold">
              {{ data.funnel.prospectiveMembers }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Trial scheduled
            </dt>
            <dd class="font-display text-xl font-semibold">
              {{ data.funnel.trialScheduled }}
            </dd>
            <p class="text-sm text-muted">
              {{ pct(data.funnel.lineToTrialRate) }} of people
            </p>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Trial attended
            </dt>
            <dd class="font-display text-xl font-semibold">
              {{ data.funnel.trialAttended }}
            </dd>
            <p class="text-sm text-muted">
              {{ pct(data.funnel.scheduledToAttendedRate) }} of scheduled
            </p>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Converted
            </dt>
            <dd class="font-display text-xl font-semibold">
              {{ data.funnel.converted }}
            </dd>
            <p class="text-sm text-muted">
              {{ pct(data.funnel.attendedToJoinedRate) }} of attended · {{ pct(data.funnel.lineToJoinedRate) }} of people
            </p>
          </div>
        </dl>
        <p class="mt-4 text-sm text-muted">
          Trial activity (rows, not people): {{ data.trialActivity.noShowCount }} no-shows, {{ data.trialActivity.cancelledCount }} cancellations, {{ data.trialActivity.linesWithMultipleTrials }} people with more than one trial.
        </p>
      </AppPanel>

      <div class="md:hidden">
        <AppButton
          variant="secondary"
          type="button"
          @click="showFullTables = !showFullTables"
        >
          {{ showFullTables ? 'Hide tables' : 'Full table' }}
        </AppButton>
      </div>

      <div
        :class="showFullTables ? 'grid gap-6 lg:grid-cols-2' : 'hidden md:grid md:gap-6 lg:grid-cols-2'"
      >
        <AppPanel title="By source">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>
                    Source
                  </th>
                  <th class="num">
                    Households
                  </th>
                  <th class="num">
                    People
                  </th>
                  <th class="num">
                    Converted
                  </th>
                  <th
                    v-if="isAdmin"
                    class="num"
                  >
                    Converted MRR
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in data.groupings.bySource"
                  :key="String(row.key)"
                >
                  <td>
                    {{ row.label === 'unattributed' ? 'Unattributed' : sourceLabel(String(row.label)) }}
                  </td>
                  <td class="num">
                    {{ row.households }}
                  </td>
                  <td class="num">
                    {{ row.prospectiveMembers }}
                  </td>
                  <td class="num">
                    {{ row.converted }}
                  </td>
                  <td
                    v-if="isAdmin"
                    class="num"
                  >
                    {{ dollars(Number(row.newMrrCents ?? 0)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppPanel>

        <AppPanel title="By program">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>
                    Program
                  </th>
                  <th class="num">
                    People
                  </th>
                  <th class="num">
                    Converted
                  </th>
                  <th
                    v-if="isAdmin"
                    class="num"
                  >
                    Converted MRR
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in data.groupings.byProgram"
                  :key="String(row.key)"
                >
                  <td>
                    {{ row.label }}
                  </td>
                  <td class="num">
                    {{ row.prospectiveMembers }}
                  </td>
                  <td class="num">
                    {{ row.converted }}
                  </td>
                  <td
                    v-if="isAdmin"
                    class="num"
                  >
                    {{ dollars(Number(row.newMrrCents ?? 0)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppPanel>

        <AppPanel title="By campaign">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>
                    Campaign
                  </th>
                  <th class="num">
                    Households
                  </th>
                  <th class="num">
                    People
                  </th>
                  <th class="num">
                    Converted
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in data.groupings.byCampaign"
                  :key="String(row.key)"
                >
                  <td>
                    {{ row.label }}
                  </td>
                  <td class="num">
                    {{ row.households }}
                  </td>
                  <td class="num">
                    {{ row.prospectiveMembers }}
                  </td>
                  <td class="num">
                    {{ row.converted }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppPanel>
      </div>

      <AppPanel title="Lost reasons">
        <AppEmpty
          v-if="!data.lost.byReason.length"
          bare
          title="No lost outcomes in range"
        />
        <ul
          v-else
          class="panel-list space-y-2 text-sm"
        >
          <li
            v-for="row in data.lost.byReason"
            :key="String(row.key)"
            class="kv-row"
          >
            <span class="min-w-0 break-words">{{ row.label }}</span>
            <span>{{ row.count }}</span>
          </li>
        </ul>
      </AppPanel>

      <div :class="showFullTables ? 'space-y-6' : 'hidden space-y-6 md:block'">
        <AppPanel
          v-if="isAdmin && data.groupings.byOffering.length"
          title="By offering"
          description="Converted MRR by membership offering. Snapshot values, not pipeline forecast."
        >
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>
                    Offering
                  </th>
                  <th class="num">
                    Conversions
                  </th>
                  <th class="num">
                    Converted MRR
                  </th>
                  <th class="num">
                    Enrollment
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in data.groupings.byOffering"
                  :key="String(row.key)"
                >
                  <td>
                    {{ row.label }}
                  </td>
                  <td class="num">
                    {{ row.conversions }}
                  </td>
                  <td class="num">
                    {{ dollars(Number(row.newMrrCents ?? 0)) }}
                  </td>
                  <td class="num">
                    {{ dollars(Number(row.enrollmentCents ?? 0)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppPanel>

        <AppPanel
          v-if="isAdmin"
          title="Meta-reported performance"
          description="Meta spend and CRM outcomes stay separate unless you explicitly map campaigns. Reach is not summed."
        >
          <AppEmpty
            v-if="!metaReport?.campaigns.length"
            bare
            title="No stored Meta campaigns"
            description="ADMIN can sync from Settings → Meta. Missing ads_read access is documented; fixtures cover automated tests."
          />
          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="data-table">
              <thead>
                <tr>
                  <th>
                    Meta campaign
                  </th>
                  <th>
                    Mapped internal
                  </th>
                  <th class="num">
                    Spend
                  </th>
                  <th class="num">
                    Clicks
                  </th>
                  <th class="num">
                    Households
                  </th>
                  <th class="num">
                    Converted MRR
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in metaReport.campaigns"
                  :key="row.name"
                >
                  <td>
                    {{ row.name }}
                  </td>
                  <td>{{ row.mapped.map(item => item.name).join(', ') || 'Unmapped' }}</td>
                  <td class="num">
                    {{ dollars(row.metaReported.spendCents) }}
                  </td>
                  <td class="num">
                    {{ row.metaReported.clicks }}
                  </td>
                  <td class="num">
                    {{ row.internalMapped.households }}
                  </td>
                  <td class="num">
                    {{ dollars(row.internalMapped.newMrrCents) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppPanel>
      </div>

      <p class="text-sm text-muted">
        Dates are America/Denver calendar days. Follow-up: {{ data.followUp.completedInRange }} completed in range, {{ data.followUp.overdueOpen }} currently overdue.
        Median days inquiry → conversion: {{ data.timing.medianDaysInquiryToConversion ?? '—' }}.
      </p>
    </template>
  </section>
</template>
