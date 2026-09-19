<script setup lang="ts">
import { formatUsdFromCents } from '#shared/utils/money'
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
      <div class="grid gap-3 sm:grid-cols-3">
        <NuxtLink
          to="/opportunities"
          class="panel p-4 hover:border-navy-600/30"
        >
          <p class="text-sm text-muted">
            Open pipeline (one-time)
          </p>
          <p class="mt-1 font-display text-2xl font-semibold">
            {{ formatUsdFromCents(data.current.openPipelineOneTimeCents) }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/opportunities"
          class="panel p-4 hover:border-navy-600/30"
        >
          <p class="text-sm text-muted">
            Open pipeline MRR
          </p>
          <p class="mt-1 font-display text-2xl font-semibold">
            {{ formatUsdFromCents(data.current.openPipelineMrrCents) }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/activities?queue=overdue"
          class="panel p-4 hover:border-navy-600/30"
        >
          <p class="text-sm text-muted">
            Overdue activities
          </p>
          <p class="mt-1 font-display text-2xl font-semibold">
            {{ data.current.activities.overdue }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/leads"
          class="panel p-4 hover:border-navy-600/30"
        >
          <p class="text-sm text-muted">
            Leads (current)
          </p>
          <p class="mt-1 text-sm">
            New {{ data.current.leadsByStage.new }}
            · Contacted {{ data.current.leadsByStage.contacted }}
            · Qualified {{ data.current.leadsByStage.qualified }}
          </p>
        </NuxtLink>
        <div class="panel p-4">
          <p class="text-sm text-muted">
            Activity queue
          </p>
          <p class="mt-1 text-sm">
            Due today {{ data.current.activities.dueToday }}
            · Upcoming {{ data.current.activities.upcoming }}
          </p>
        </div>
        <div class="panel p-4">
          <p class="text-sm text-muted">
            Period outcomes
          </p>
          <p class="mt-1 text-sm">
            New leads {{ data.period.newLeads }}
            · New opps {{ data.period.newOpportunities }}
          </p>
          <p class="text-sm">
            Won {{ data.period.wonCount }} / Lost {{ data.period.lostCount }}
            · Win rate {{ pct(data.period.winRate) }}
          </p>
          <p class="text-sm">
            Won {{ formatUsdFromCents(data.period.wonOneTimeCents) }}
            · MRR {{ formatUsdFromCents(data.period.wonMrrCents) }}
          </p>
          <p class="text-xs text-muted">
            Lead → Opportunity {{ pct(data.period.leadToOpportunity) }} (simple operational metric, not a cohort funnel)
          </p>
        </div>
        <NuxtLink
          to="/proposals"
          class="panel p-4 hover:border-navy-600/30"
        >
          <p class="text-sm text-muted">
            Proposals (current)
          </p>
          <p class="mt-1 text-sm">
            Draft {{ data.proposals.draft }}
            · Issued {{ data.proposals.issued }}
            · Sent {{ data.proposals.sent }}
          </p>
          <p class="text-sm">
            Accepted {{ data.proposals.accepted }}
            · Declined {{ data.proposals.declined }}
            · Past valid-through {{ data.proposals.pastValidThrough }}
          </p>
        </NuxtLink>
      </div>
      <AppPanel title="Source performance (current attribution)">
        <ul class="space-y-2 text-sm">
          <li
            v-for="source in data.sources.filter(row => row.leads || row.opportunities || row.wonCount || row.name === 'Unattributed')"
            :key="String(source.id)"
          >
            {{ source.name }}
            · Leads {{ source.leads }}
            · Opps {{ source.opportunities }}
            · Won {{ source.wonCount }}
            · {{ formatUsdFromCents(source.wonOneTimeCents) }}
            · MRR {{ formatUsdFromCents(source.wonMrrCents) }}
          </li>
        </ul>
      </AppPanel>
      <AppPanel title="Campaign performance">
        <ul class="space-y-2 text-sm">
          <li
            v-for="campaign in data.campaigns"
            :key="campaign.id"
          >
            <NuxtLink :to="`/campaigns/${campaign.id}`">
              {{ campaign.name }}
            </NuxtLink>
            · Clicks {{ campaign.clicks }}
            · Leads {{ campaign.leads }}
            · Click → Lead {{ pct(campaign.clickToLead) }}
            · Won {{ campaign.wonCount }}
            · {{ formatUsdFromCents(campaign.wonOneTimeCents) }}
          </li>
        </ul>
        <p
          v-if="!data.campaigns.length"
          class="text-sm text-muted"
        >
          No campaigns yet.
        </p>
      </AppPanel>
      <AppPanel title="Tracking link clicks">
        <ul class="space-y-2 text-sm">
          <li
            v-for="link in data.trackingLinks"
            :key="link.id"
          >
            {{ link.label }}
            · Clicks {{ link.clicks }}
            · Leads {{ link.leads }}
            · Click → Lead {{ pct(link.clickToLead) }}
          </li>
        </ul>
      </AppPanel>
    </template>
    <p class="text-xs text-muted">
      {{ leadStageLabel('new') }} through converted remain current-state counts. Budget on campaigns is a planning number, not ROI.
    </p>
  </section>
</template>
