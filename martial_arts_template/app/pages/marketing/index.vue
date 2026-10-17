<script setup lang="ts">
import { centsToDollarString } from '#shared/utils/money'
import { campaignStaffPath } from '#shared/utils/campaign'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'Marketing',
})

interface MarketingOverview {
  ready: boolean
  notes: { meta: string, crm: string, attributed: string }
  areas: Array<{ to: string, title: string, description: string }>
  activeCampaigns: Array<{ id: number, name: string, budgetCents: number | null }>
  approachingCampaigns: Array<{ id: number, name: string }>
  tasks: { overdue: number, dueToday: number, upcoming: number, assetRequests: number }
  content: {
    needingAssets: number
    needingReview: number
    readyToPublish: number
    upcomingPublications: Array<{ id: number, title: string }>
    recentPublications: Array<{ id: number, channel: string, publicUrl: string | null }>
  }
  events: Array<{ id: number, title: string, registrationCount: number, participantCount: number }>
  campaignOutcomes: Array<{
    id: number
    name: string
    plannedBudgetCents: number | null
    plannedBudgetSource: string
    metaSpendCents: number
    metaSpendSource: string
    mapped: boolean
    attributed: {
      source: string
      households: number
      prospectiveMembers: number
      trialsScheduled: number
      trialsAttended: number
      joined: number
      acquiredMrrCents: number
    }
    eventRegistrationCount: number
  }>
}

const { data, error } = await useFetch<MarketingOverview>('/api/marketing/overview')
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="Marketing"
      description="Command center for Campaign work. This is not the acquisition Dashboard."
    />

    <AppAlert v-if="error">
      You do not have Marketing access, or the overview could not be loaded.
    </AppAlert>

    <div
      v-if="data"
      class="stat-row"
    >
      <NuxtLink
        to="/marketing/tasks"
        class="stat"
      >
        <p class="stat-label">
          Marketing Tasks
        </p>
        <p class="stat-value text-ink">
          {{ data.tasks.overdue }}
        </p>
        <p class="stat-hint">
          Overdue · {{ data.tasks.dueToday }} due today · {{ data.tasks.assetRequests }} asset requests
        </p>
      </NuxtLink>
      <NuxtLink
        to="/marketing/content"
        class="stat"
      >
        <p class="stat-label">
          Content
        </p>
        <p class="stat-value text-ink">
          {{ data.content.needingReview }}
        </p>
        <p class="stat-hint">
          Needs review · {{ data.content.needingAssets }} need assets · {{ data.content.readyToPublish }} ready
        </p>
      </NuxtLink>
      <NuxtLink
        to="/marketing/campaigns"
        class="stat"
      >
        <p class="stat-label">
          Active Campaigns
        </p>
        <p class="stat-value text-ink">
          {{ data.activeCampaigns.length }}
        </p>
        <p class="stat-hint">
          {{ data.approachingCampaigns.length }} approaching a start or end date
        </p>
      </NuxtLink>
      <NuxtLink
        to="/marketing/events"
        class="stat"
      >
        <p class="stat-label">
          Upcoming events
        </p>
        <p class="stat-value text-ink">
          {{ data.events.length }}
        </p>
        <p class="stat-hint">
          Registration counts are internal CRM event rows, not unique people.
        </p>
      </NuxtLink>
    </div>

    <AppPanel
      v-if="data?.campaignOutcomes.length"
      title="Campaign outcomes"
      description="Labels say where each number comes from. Meta spend requires an explicit campaign map."
    >
      <div class="divide-y divide-line md:hidden">
        <NuxtLink
          v-for="row in data.campaignOutcomes"
          :key="row.id"
          :to="campaignStaffPath(row.id)"
          class="block py-3 first:pt-0 last:pb-0"
        >
          <p class="font-medium text-ink">
            {{ row.name }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ row.attributed.joined }} joined · {{ row.attributed.prospectiveMembers }} people
          </p>
          <p class="mt-1 text-sm text-muted">
            Spend
            <template v-if="row.mapped">${{ centsToDollarString(row.metaSpendCents) }}</template>
            <template v-else>not mapped</template>
          </p>
        </NuxtLink>
      </div>
      <div class="hidden overflow-x-auto md:block">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Planned budget (internal)</th>
              <th>Meta spend (Meta-reported)</th>
              <th>People (attributed)</th>
              <th>Joined (attributed)</th>
              <th>Event registrations (CRM)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in data.campaignOutcomes"
              :key="row.id"
            >
              <td>
                <NuxtLink :to="campaignStaffPath(row.id)">
                  {{ row.name }}
                </NuxtLink>
              </td>
              <td>${{ centsToDollarString(row.plannedBudgetCents ?? 0) }}</td>
              <td>
                <template v-if="row.mapped">
                  ${{ centsToDollarString(row.metaSpendCents) }}
                </template>
                <span
                  v-else
                  class="text-muted"
                >Not mapped</span>
              </td>
              <td>{{ row.attributed.prospectiveMembers }}</td>
              <td>{{ row.attributed.joined }}</td>
              <td>{{ row.eventRegistrationCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-xs text-muted">
        {{ data.notes.meta }} {{ data.notes.attributed }} {{ data.notes.crm }}
      </p>
    </AppPanel>

    <AppPanel>
      <ul class="link-list">
        <li
          v-for="area in data?.areas ?? []"
          :key="area.to"
        >
          <NuxtLink
            :to="area.to"
            class="link-list-item"
          >
            <p class="link-list-title">
              {{ area.title }}
            </p>
            <p class="link-list-text">
              {{ area.description }}
            </p>
          </NuxtLink>
        </li>
      </ul>
    </AppPanel>
  </section>
</template>
