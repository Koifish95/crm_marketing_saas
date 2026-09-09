<script setup lang="ts">
import { toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Meta',
})

interface MetaCampaignRow {
  id: number
  externalId: string
  name: string
  status: string | null
  effectiveStatus: string | null
  mappedCampaigns: Array<{ id: number, name: string }>
  adSetCount: number
  adCount: number
}

interface SyncRun {
  id: number
  status: string
  startedAt: string
  completedAt: string | null
  recordsFetched: number
  recordsInserted: number
  recordsUpdated: number
  errorSummary: string | null
}

interface StatusPayload {
  configured: boolean
  graphApiVersion: string
  adAccountId: string | null
  permission: string
  notes: string[]
  lastSync: SyncRun | null
  recentRuns: SyncRun[]
  campaigns: MetaCampaignRow[]
}

interface InternalCampaign {
  id: number
  name: string
}

const errorMessage = ref('')
const pendingSync = ref(false)
const selected = ref<Record<number, string>>({})

const { data, refresh } = await useFetch<StatusPayload>('/api/admin/meta/status')
const { data: internals } = await useFetch<InternalCampaign[]>('/api/campaigns')

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function sync() {
  errorMessage.value = ''
  pendingSync.value = true
  try {
    await $fetch('/api/admin/meta/sync', { method: 'POST' })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Meta sync failed.')
    await refresh()
  } finally {
    pendingSync.value = false
  }
}

async function mapCampaign(metaCampaignId: number) {
  errorMessage.value = ''
  const campaignId = Number(selected.value[metaCampaignId])
  if (!campaignId) {
    return
  }
  try {
    await $fetch('/api/admin/meta/mappings', {
      method: 'POST',
      body: { campaignId, metaCampaignId },
    })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that mapping.')
  }
}

async function unmap(campaignId: number) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/meta/mappings/${campaignId}`, { method: 'DELETE' })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not remove that mapping.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Meta"
      description="Read-only Marketing API sync. Map Meta campaigns explicitly. Names are never matched automatically."
    >
      <template #actions>
        <AppButton
          :disabled="pendingSync || !data?.configured"
          :loading="pendingSync"
          @click="sync"
        >
          Sync Meta data
        </AppButton>
      </template>
    </AppPageHeader>

    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AppStat
        label="Configuration"
        :hint="data?.adAccountId || 'Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID'"
      >
        {{ data?.configured ? 'Configured' : 'Not configured' }}
      </AppStat>
      <AppStat
        label="Graph API"
        :hint="data?.permission"
      >
        {{ data?.graphApiVersion }}
      </AppStat>
      <AppStat
        label="Last sync"
        :hint="data?.lastSync?.errorSummary || data?.lastSync?.status || 'No runs yet'"
      >
        {{ data?.lastSync ? toBusinessDateTime(new Date(data.lastSync.startedAt).getTime()) : '—' }}
      </AppStat>
      <AppStat
        label="Stored campaigns"
        hint="After a successful sync"
      >
        {{ data?.campaigns.length ?? 0 }}
      </AppStat>
    </div>

    <AppPanel
      title="Manual mapping"
      description="Organic campaigns can stay unmapped. Paid spend is only tied to an internal campaign after you pick it here."
    >
      <AppEmpty
        v-if="!data?.campaigns.length"
        bare
        title="No Meta campaigns stored"
        description="Configure env vars and run a sync. Tests and local work can use fixtures when live ads_read access is missing."
      />
      <ul
        v-else
        class="panel-list divide-y divide-line text-sm"
      >
        <li
          v-for="campaign in data.campaigns"
          :key="campaign.id"
          class="space-y-2 py-3 first:pt-0 last:pb-0"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="break-words font-medium text-navy-900">
                {{ campaign.name }}
              </p>
              <p class="text-muted">
                {{ campaign.effectiveStatus || campaign.status || 'unknown' }}
                · {{ campaign.adSetCount }} ad sets · {{ campaign.adCount }} ads
              </p>
            </div>
            <AppBadge :tone="campaign.mappedCampaigns.length ? 'success' : 'warning'">
              {{ campaign.mappedCampaigns.length ? 'Mapped' : 'Unmapped' }}
            </AppBadge>
          </div>
          <p
            v-for="mapped in campaign.mappedCampaigns"
            :key="mapped.id"
            class="flex flex-wrap items-center gap-2"
          >
            Internal: {{ mapped.name }}
            <AppButton
              variant="subtle"
              @click="unmap(mapped.id)"
            >
              Unmap
            </AppButton>
          </p>
          <form
            class="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            @submit.prevent="mapCampaign(campaign.id)"
          >
            <select
              v-model="selected[campaign.id]"
              class="control min-w-0 flex-1"
            >
              <option value="">
                Choose internal campaign
              </option>
              <option
                v-for="item in internals"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select>
            <AppButton type="submit">
              Map
            </AppButton>
          </form>
        </li>
      </ul>
    </AppPanel>

    <AppPanel title="Sync history">
      <AppEmpty
        v-if="!data?.recentRuns.length"
        bare
        title="No sync runs"
      />
      <ul
        v-else
        class="panel-list space-y-2 text-sm"
      >
        <li
          v-for="run in data.recentRuns"
          :key="run.id"
          class="kv-row flex-wrap"
        >
          <span class="min-w-0 break-words">{{ run.status }} · fetched {{ run.recordsFetched }} · inserted {{ run.recordsInserted }} · updated {{ run.recordsUpdated }}</span>
          <span class="text-muted">{{ toBusinessDateTime(new Date(run.startedAt).getTime()) }}</span>
        </li>
      </ul>
    </AppPanel>
    <p class="text-sm text-muted">
      Tokens stay on the server. This page never displays secrets.
      Planned internal budget is not Meta-reported spend.
    </p>
  </section>
</template>
