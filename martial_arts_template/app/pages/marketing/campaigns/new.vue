<script setup lang="ts">
import { dollarsToCents } from '#shared/utils/money'
import { campaignStaffPath } from '#shared/utils/campaign'
import { CAMPAIGN_STATUSES, campaignStatusLabel } from '#shared/utils/labels'
import { datetimeLocalValueToIso } from '#shared/utils/time'
import type { CampaignStatus } from '#shared/schemas/enums'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'New Campaign',
})

interface Person {
  id: number
  displayName: string
}

interface CreatedCampaign {
  id: number
}

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_CAMPAIGNS')))

const errorMessage = ref('')
const pending = ref(false)
const { data: people } = await useFetch<Person[]>('/api/users')

const form = reactive({
  name: '',
  kind: 'ORGANIC' as 'ORGANIC' | 'PAID',
  status: 'DRAFT' as CampaignStatus,
  budget: '0',
  ownerUserId: '' as string | number,
  startsAt: '',
  endsAt: '',
})

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function create() {
  if (!canManage.value) {
    return
  }
  errorMessage.value = ''
  pending.value = true
  try {
    const created = await $fetch<CreatedCampaign>('/api/admin/campaigns', {
      method: 'POST',
      body: {
        name: form.name,
        kind: form.kind,
        status: form.status,
        budgetCents: form.budget.trim() ? dollarsToCents(form.budget.trim()) : 0,
        ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : undefined,
        startsAt: datetimeLocalValueToIso(form.startsAt),
        endsAt: datetimeLocalValueToIso(form.endsAt),
      },
    })
    await navigateTo(campaignStaffPath(created.id))
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not create that campaign.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="New campaign"
      description="Establish the campaign, then finish planning and tracking links on the record."
    >
      <template #actions>
        <NuxtLink
          to="/marketing/campaigns"
          class="btn btn-secondary"
        >
          Cancel
        </NuxtLink>
      </template>
    </AppPageHeader>

    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <AppAlert
      v-if="!canManage"
      tone="warning"
    >
      You can view campaigns, but creating one requires Manage campaigns.
    </AppAlert>

    <form
      v-else
      class="panel grid gap-3 p-5 sm:grid-cols-2"
      @submit.prevent="create"
    >
      <AppField
        label="Campaign name"
        required
      >
        <input
          v-model="form.name"
          class="control"
          required
        >
      </AppField>
      <AppField label="Kind">
        <select
          v-model="form.kind"
          class="control"
        >
          <option value="ORGANIC">
            Organic
          </option>
          <option value="PAID">
            Paid
          </option>
        </select>
      </AppField>
      <AppField label="Status">
        <select
          v-model="form.status"
          class="control"
        >
          <option
            v-for="item in CAMPAIGN_STATUSES"
            :key="item"
            :value="item"
          >
            {{ campaignStatusLabel(item) }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Planned budget USD"
        hint="$0 is valid for organic work. This is not Meta spend."
      >
        <input
          v-model="form.budget"
          class="control"
        >
      </AppField>
      <AppField label="Owner">
        <select
          v-model="form.ownerUserId"
          class="control"
        >
          <option value="">
            Unassigned
          </option>
          <option
            v-for="person in people ?? []"
            :key="person.id"
            :value="person.id"
          >
            {{ person.displayName }}
          </option>
        </select>
      </AppField>
      <AppField label="Planned start">
        <input
          v-model="form.startsAt"
          type="datetime-local"
          class="control"
        >
      </AppField>
      <AppField label="Planned end">
        <input
          v-model="form.endsAt"
          type="datetime-local"
          class="control"
        >
      </AppField>
      <div class="sm:col-span-2">
        <AppButton
          type="submit"
          :loading="pending"
        >
          Create campaign
        </AppButton>
      </div>
    </form>
  </section>
</template>
