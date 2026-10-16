<script setup lang="ts">
import { NuxtLink } from '#components'
import { REPORT_RANGE_PRESETS } from '#shared/utils/catalog'
import { activityTypeLabel, leadStageLabel, opportunityStageLabel } from '#shared/utils/pipeline'

definePageMeta({
  layout: 'internal',
  middleware: 'auth',
})

useHead({
  title: 'Dashboard',
})

type Dashboard = {
  current: {
    openOpportunityCount: number
    openPipelineOneTimeCents: number
    openPipelineMrrCents: number
    leadsByStage: Record<string, number>
    activities: { overdue: number, dueToday: number, upcoming: number, open: number }
  }
  period: {
    newLeads: number
    newOpportunities: number
    wonCount: number
    lostCount: number
    wonOneTimeCents: number
    wonMrrCents: number
    winRate: number | null
    leadToOpportunity: number | null
  }
  sources: Array<{ id: number | null, name: string, leads: number, opportunities: number, wonCount: number, lostCount: number, wonOneTimeCents: number, wonMrrCents: number }>
  campaigns: Array<{ id: number, name: string, clicks: number, leads: number, clickToLead: number | null, opportunities: number, wonCount: number, wonOneTimeCents: number, wonMrrCents: number, budgetCents: number | null }>
  trackingLinks: Array<{ id: number, label: string, clicks: number, leads: number, clickToLead: number | null }>
  proposals: { draft: number, issued: number, sent: number, accepted: number, declined: number, pastValidThrough: number }
  work: {
    overdue: Array<{ id: number, description: string, type: string, dueAt: string | Date | null, opportunityName: string | null }>
    dueToday: Array<{ id: number, description: string, type: string, dueAt: string | Date | null, opportunityName: string | null }>
    openOpportunities: Array<{
      id: number
      name: string
      companyName: string
      stage: string
      amountCents: number
      mrrCents: number
      nextActivity: { description: string, type: string, dueAt: string | Date | null, bucket: string } | null
    }>
  }
}

const preset = ref('this_month')
const start = ref('')
const end = ref('')
const query = computed(() => ({
  preset: preset.value,
  start: preset.value === 'custom' ? start.value || undefined : undefined,
  end: preset.value === 'custom' ? end.value || undefined : undefined,
}))
const { data, error, pending } = await useFetch<Dashboard>('/api/dashboard', { query })

function pct(value: number | null) {
  if (value == null) {
    return '—'
  }
  return `${Math.round(value * 1000) / 10}%`
}

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const sourceRows = computed(() => (data.value?.sources ?? [])
  .filter(row => row.leads || row.opportunities || row.wonCount || row.name === 'Unattributed'))

const metricGroups = computed(() => {
  const d = data.value
  if (!d) {
    return []
  }
  return [
    {
      title: 'Leads (current)',
      to: '/leads',
      rows: [
        { label: 'New', value: d.current.leadsByStage.new },
        { label: 'Contacted', value: d.current.leadsByStage.contacted },
        { label: 'Qualified', value: d.current.leadsByStage.qualified },
      ],
    },
    {
      title: 'Activity queue',
      to: undefined,
      rows: [
        { label: 'Due today', value: d.current.activities.dueToday },
        { label: 'Upcoming', value: d.current.activities.upcoming },
      ],
    },
    {
      title: 'Period outcomes',
      to: undefined,
      rows: [
        { label: 'New leads', value: d.period.newLeads },
        { label: 'New opps', value: d.period.newOpportunities },
        { label: 'Won / Lost', value: `${d.period.wonCount} / ${d.period.lostCount}` },
        { label: 'Win rate', value: pct(d.period.winRate) },
        { label: 'Won', value: usd(d.period.wonOneTimeCents) },
        { label: 'MRR', value: usd(d.period.wonMrrCents) },
      ],
      note: `Lead → Opportunity ${pct(d.period.leadToOpportunity)} (simple operational metric, not a cohort funnel)`,
    },
    {
      title: 'Proposals (current)',
      to: '/proposals',
      wide: true,
      rows: [
        { label: 'Draft', value: d.proposals.draft },
        { label: 'Issued', value: d.proposals.issued },
        { label: 'Sent', value: d.proposals.sent },
        { label: 'Accepted', value: d.proposals.accepted },
        { label: 'Declined', value: d.proposals.declined },
        { label: 'Past valid-through', value: d.proposals.pastValidThrough },
      ],
    },
  ]
})

const presetLabel: Record<string, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_30_days: 'Last 30 days',
  this_quarter: 'This quarter',
  this_year: 'This year',
  custom: 'Custom range',
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Dashboard"
      description="Work today first. Metrics below are operational, not ROI. Outbound academies start as Company → Contacts → Opportunity."
    />
    <div class="flex flex-wrap items-end gap-3">
      <AppField label="Period">
        <select
          v-model="preset"
          class="control"
        >
          <option
            v-for="code in REPORT_RANGE_PRESETS"
            :key="code"
            :value="code"
          >
            {{ presetLabel[code] }}
          </option>
        </select>
      </AppField>
      <AppField
        v-if="preset === 'custom'"
        label="Start"
      >
        <input
          v-model="start"
          class="control"
          type="date"
        >
      </AppField>
      <AppField
        v-if="preset === 'custom'"
        label="End"
      >
        <input
          v-model="end"
          class="control"
          type="date"
        >
      </AppField>
    </div>
    <AppAlert v-if="error">
      Could not load the dashboard. Refresh and try again.
    </AppAlert>
    <p
      v-else-if="pending && !data"
      class="text-sm text-muted"
    >
      Loading dashboard…
    </p>
    <template v-else-if="data">
      <AppPanel title="Work today">
        <div class="grid gap-4 lg:grid-cols-3">
          <div>
            <p class="text-sm font-semibold">
              Overdue
            </p>
            <ul class="mt-2 space-y-2 text-sm">
              <li
                v-for="activity in data.work.overdue"
                :key="activity.id"
              >
                <NuxtLink to="/activities?queue=overdue">
                  {{ activity.description }}
                </NuxtLink>
                <span class="text-muted">
                  · {{ activity.opportunityName || 'Unattached' }}
                </span>
              </li>
            </ul>
            <p
              v-if="!data.work.overdue.length"
              class="mt-2 text-sm text-muted"
            >
              Nothing overdue.
            </p>
          </div>
          <div>
            <p class="text-sm font-semibold">
              Due today
            </p>
            <ul class="mt-2 space-y-2 text-sm">
              <li
                v-for="activity in data.work.dueToday"
                :key="activity.id"
              >
                <NuxtLink to="/activities?queue=due_today">
                  {{ activity.description }}
                </NuxtLink>
                <span class="text-muted">
                  · {{ activity.opportunityName || 'Unattached' }}
                </span>
              </li>
            </ul>
            <p
              v-if="!data.work.dueToday.length"
              class="mt-2 text-sm text-muted"
            >
              Nothing due today.
            </p>
          </div>
          <div>
            <p class="text-sm font-semibold">
              Active opportunities
            </p>
            <ul class="mt-2 space-y-2 text-sm">
              <li
                v-for="opportunity in data.work.openOpportunities"
                :key="opportunity.id"
              >
                <NuxtLink :to="`/opportunities/${opportunity.id}`">
                  {{ opportunity.name }}
                </NuxtLink>
                <span class="text-muted">
                  · {{ opportunity.companyName }}
                  · {{ opportunityStageLabel(opportunity.stage) }}
                  · {{ opportunity.nextActivity ? activityTypeLabel(opportunity.nextActivity.type) : 'No next action' }}
                </span>
              </li>
            </ul>
            <p
              v-if="!data.work.openOpportunities.length"
              class="mt-2 text-sm text-muted"
            >
              No open opportunities.
            </p>
          </div>
        </div>
      </AppPanel>
      <div class="stat-grid">
        <NuxtLink
          to="/opportunities"
          class="stat-cell stat-link"
        >
          <p class="text-sm text-muted">
            Open pipeline (one-time)
          </p>
          <p class="mt-1 font-display text-2xl font-semibold tabular-nums">
            {{ usd(data.current.openPipelineOneTimeCents) }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/opportunities"
          class="stat-cell stat-link"
        >
          <p class="text-sm text-muted">
            Open pipeline MRR
          </p>
          <p class="mt-1 font-display text-2xl font-semibold tabular-nums">
            {{ usd(data.current.openPipelineMrrCents) }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/activities?queue=overdue"
          class="stat-cell stat-link"
        >
          <p class="text-sm text-muted">
            Overdue activities
          </p>
          <p class="mt-1 font-display text-2xl font-semibold tabular-nums">
            {{ data.current.activities.overdue }}
          </p>
        </NuxtLink>
        <component
          :is="group.to ? NuxtLink : 'div'"
          v-for="group in metricGroups"
          :key="group.title"
          :to="group.to"
          class="stat-cell"
          :class="[group.to ? 'stat-link' : '', group.wide ? 'sm:col-span-3' : '']"
        >
          <p class="text-sm font-semibold text-navy-900">
            {{ group.title }}
          </p>
          <dl
            class="mt-2 text-sm"
            :class="group.wide ? 'grid gap-x-12 gap-y-1 sm:grid-cols-3' : 'space-y-1'"
          >
            <div
              v-for="row in group.rows"
              :key="row.label"
              class="flex items-baseline justify-between gap-4"
            >
              <dt class="min-w-0 text-muted">
                {{ row.label }}
              </dt>
              <dd class="shrink-0 tabular-nums">
                {{ row.value }}
              </dd>
            </div>
          </dl>
          <p
            v-if="group.note"
            class="mt-2 text-xs text-muted"
          >
            {{ group.note }}
          </p>
        </component>
      </div>
      <AppPanel title="Source performance (current attribution)">
        <div class="table-wrap table-flush">
          <table class="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th class="num">
                  Leads
                </th>
                <th class="num">
                  Opps
                </th>
                <th class="num">
                  Won
                </th>
                <th class="num">
                  One-time
                </th>
                <th class="num">
                  MRR
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="source in sourceRows"
                :key="String(source.id)"
              >
                <td>{{ source.name }}</td>
                <td class="num">
                  {{ source.leads }}
                </td>
                <td class="num">
                  {{ source.opportunities }}
                </td>
                <td class="num">
                  {{ source.wonCount }}
                </td>
                <td class="num">
                  {{ usd(source.wonOneTimeCents) }}
                </td>
                <td class="num">
                  {{ usd(source.wonMrrCents) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppPanel>
      <AppPanel title="Campaign performance">
        <AppEmpty
          v-if="!data.campaigns.length"
          bare
          title="No campaigns yet."
          description="Create a campaign to see its clicks, leads and wins here."
        />
        <div
          v-else
          class="table-wrap table-flush"
        >
          <table class="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th class="num">
                  Clicks
                </th>
                <th class="num">
                  Leads
                </th>
                <th class="num">
                  Click → Lead
                </th>
                <th class="num">
                  Won
                </th>
                <th class="num">
                  One-time
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="campaign in data.campaigns"
                :key="campaign.id"
              >
                <td>
                  <NuxtLink :to="`/campaigns/${campaign.id}`">
                    {{ campaign.name }}
                  </NuxtLink>
                </td>
                <td class="num">
                  {{ campaign.clicks }}
                </td>
                <td class="num">
                  {{ campaign.leads }}
                </td>
                <td class="num">
                  {{ pct(campaign.clickToLead) }}
                </td>
                <td class="num">
                  {{ campaign.wonCount }}
                </td>
                <td class="num">
                  {{ usd(campaign.wonOneTimeCents) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppPanel>
      <AppPanel title="Tracking link clicks">
        <AppEmpty
          v-if="!data.trackingLinks.length"
          bare
          title="No tracking links yet."
          description="Add a tracking link to a campaign to count its clicks here."
        />
        <div
          v-else
          class="table-wrap table-flush"
        >
          <table class="data-table">
            <thead>
              <tr>
                <th>Link</th>
                <th class="num">
                  Clicks
                </th>
                <th class="num">
                  Leads
                </th>
                <th class="num">
                  Click → Lead
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="link in data.trackingLinks"
                :key="link.id"
              >
                <td>{{ link.label }}</td>
                <td class="num">
                  {{ link.clicks }}
                </td>
                <td class="num">
                  {{ link.leads }}
                </td>
                <td class="num">
                  {{ pct(link.clickToLead) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppPanel>
    </template>
    <p class="text-xs text-muted">
      {{ leadStageLabel('new') }} through converted remain current-state counts. Budget on campaigns is a planning number, not ROI.
    </p>
  </section>
</template>
