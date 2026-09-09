<script setup lang="ts">
import { centsToDollarString } from '#shared/utils/money'
import { campaignLeadsPath, campaignStaffPath, parseCampaignHashId } from '#shared/utils/campaign'
import { campaignKindLabel, campaignStatusLabel, campaignStatusTone } from '#shared/utils/labels'
import { toBusinessDateTime } from '#shared/utils/time'
import type { CampaignStatus } from '#shared/schemas/enums'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'Marketing Campaigns',
})

interface Person {
  id: number
  displayName: string
}

interface CampaignRow {
  id: number
  name: string
  slug: string
  kind: 'ORGANIC' | 'PAID'
  status: CampaignStatus
  budgetCents: number | null
  startsAt: string | Date | null
  endsAt: string | Date | null
  owner?: Person | null
  leads?: Array<{ id: number }>
  householdCount?: number
}

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_CAMPAIGNS')))
const canViewMarketing = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('VIEW_MARKETING')))

const { data: campaigns, error } = await useFetch<CampaignRow[]>('/api/marketing/campaigns')
const route = useRoute()

watch(
  () => route.hash,
  async (hash) => {
    const id = parseCampaignHashId(hash)
    if (!id) {
      return
    }
    await navigateTo(campaignStaffPath(id), { replace: true })
  },
  { immediate: true },
)

function householdCount(campaign: CampaignRow) {
  if (typeof campaign.householdCount === 'number') {
    return campaign.householdCount
  }
  return campaign.leads?.length ?? 0
}

function plannedRange(campaign: CampaignRow) {
  const start = campaign.startsAt ? toBusinessDateTime(new Date(campaign.startsAt).getTime()) : ''
  const end = campaign.endsAt ? toBusinessDateTime(new Date(campaign.endsAt).getTime()) : ''
  if (!start && !end) {
    return '—'
  }
  return `${start || '—'} → ${end || '—'}`
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="Campaigns"
      description="A Marketing Campaign is a business initiative, not a Meta Ads campaign. Organic $0 campaigns are valid."
    >
      <template
        v-if="canManage"
        #actions
      >
        <NuxtLink
          to="/marketing/campaigns/new"
          class="btn btn-primary"
        >
          New campaign
        </NuxtLink>
      </template>
    </AppPageHeader>

    <AppAlert v-if="error">
      Could not load campaigns.
    </AppAlert>

    <AppEmpty
      v-if="!campaigns?.length"
      title="No Marketing Campaigns"
      description="Create an organic campaign to coordinate managed work. Spontaneous social posts do not need a record."
    />

    <div
      v-else
      class="space-y-3 md:hidden"
    >
      <NuxtLink
        v-for="campaign in campaigns"
        :key="campaign.id"
        :to="campaignStaffPath(campaign.id)"
        class="panel block p-5"
      >
        <div class="flex min-w-0 flex-wrap items-start gap-2">
          <p class="min-w-0 break-words font-semibold text-navy-900">
            {{ campaign.name }}
          </p>
          <AppBadge
            class="ml-auto shrink-0"
            :tone="campaignStatusTone(campaign.status)"
          >
            {{ campaignStatusLabel(campaign.status) }}
          </AppBadge>
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ campaignKindLabel(campaign.kind) }}
          · {{ campaign.owner?.displayName || 'Unassigned' }}
        </p>
        <p class="mt-1 text-sm text-ink">
          {{ campaign.budgetCents != null ? `$${centsToDollarString(campaign.budgetCents)}` : 'No planned budget' }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ plannedRange(campaign) }}
        </p>
        <p
          v-if="canViewMarketing"
          class="mt-1 text-xs text-muted"
        >
          {{ householdCount(campaign) }} household{{ householdCount(campaign) === 1 ? '' : 's' }}
        </p>
      </NuxtLink>
    </div>

    <div
      v-if="campaigns?.length"
      class="panel hidden overflow-x-auto md:block"
    >
      <table class="data-table">
        <thead class="border-b border-line bg-canvas text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">
              Campaign
            </th>
            <th class="px-4 py-3 font-medium">
              Status
            </th>
            <th class="px-4 py-3 font-medium">
              Kind
            </th>
            <th class="px-4 py-3 font-medium">
              Owner
            </th>
            <th class="px-4 py-3 font-medium">
              Planned budget
            </th>
            <th class="px-4 py-3 font-medium">
              Planned dates
            </th>
            <th
              v-if="canViewMarketing"
              class="px-4 py-3 font-medium"
            >
              Households
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="campaign in campaigns"
            :key="campaign.id"
          >
            <td class="px-4 py-3">
              <NuxtLink
                :to="campaignStaffPath(campaign.id)"
                class="font-medium text-navy-900 hover:text-brand-700"
              >
                {{ campaign.name }}
              </NuxtLink>
              <p class="text-xs text-muted">
                {{ campaign.slug }}
              </p>
            </td>
            <td class="px-4 py-3">
              <AppBadge :tone="campaignStatusTone(campaign.status)">
                {{ campaignStatusLabel(campaign.status) }}
              </AppBadge>
            </td>
            <td class="px-4 py-3">
              {{ campaignKindLabel(campaign.kind) }}
            </td>
            <td class="px-4 py-3">
              {{ campaign.owner?.displayName || 'Unassigned' }}
            </td>
            <td class="px-4 py-3">
              {{ campaign.budgetCents != null ? `$${centsToDollarString(campaign.budgetCents)}` : '—' }}
            </td>
            <td class="px-4 py-3 text-sm text-muted">
              {{ plannedRange(campaign) }}
            </td>
            <td
              v-if="canViewMarketing"
              class="px-4 py-3"
            >
              <NuxtLink
                :to="campaignLeadsPath(campaign.id)"
                class="text-sm font-medium text-brand-700 hover:text-brand-600"
              >
                {{ householdCount(campaign) }}
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
