<script setup lang="ts">
import { CAMPAIGN_STATUSES, campaignStatusLabel } from '#shared/utils/catalog'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Campaigns',
})

type Campaign = {
  id: number
  name: string
  status: string
  budgetCents: number | null
}
type IntakeConfig = { enabled: boolean, unavailableText: string }

const name = ref('')
const errorMessage = ref('')
const saving = ref(false)
const toggling = ref(false)
const { data: campaigns, error, pending, refresh } = await useFetch<Campaign[]>('/api/campaigns')
const { data: intake, refresh: refreshIntake } = await useFetch<IntakeConfig>('/api/settings/intake')

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await $fetch<Campaign>('/api/campaigns', {
      method: 'POST',
      body: { name: name.value, status: 'draft' },
    })
    name.value = ''
    await refresh()
    await navigateTo(`/campaigns/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that campaign.'
  } finally {
    saving.value = false
  }
}

async function toggleIntake() {
  toggling.value = true
  try {
    await $fetch('/api/settings/intake', {
      method: 'PATCH',
      body: { enabled: !intake.value?.enabled },
    })
    await refreshIntake()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not update public intake.'
  } finally {
    toggling.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Campaigns"
      description="Bounded marketing campaigns. Tracking links encode Campaign + Source. Public intake can be turned off without taking the CRM down."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load campaigns.' }}
    </AppAlert>
    <AppPanel title="Public intake">
      <p class="mb-3 text-sm text-muted">
        Untracked form: /inquire. Tracked links use /t/{token}.
        {{ intake?.enabled ? 'Intake is accepting submissions.' : (intake?.unavailableText || 'Intake is off.') }}
      </p>
      <AppButton
        :loading="toggling"
        variant="secondary"
        @click="toggleIntake"
      >
        {{ intake?.enabled ? 'Disable public intake' : 'Enable public intake' }}
      </AppButton>
    </AppPanel>
    <AppPanel title="New campaign">
      <form
        class="flex flex-wrap gap-3"
        @submit.prevent="create"
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
        <div class="self-end">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create campaign
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <AppEmpty
      v-if="!pending && !campaigns?.length"
      title="No campaigns yet"
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="campaign in campaigns"
        :key="campaign.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/campaigns/${campaign.id}`"
          class="record-item-title"
        >
          {{ campaign.name }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ campaignStatusLabel(campaign.status) }}
        </p>
      </li>
    </ul>
    <p class="text-xs text-muted">
      Lifecycle {{ CAMPAIGN_STATUSES.map(campaignStatusLabel).join(' → ') }}. A campaign may span multiple sources.
    </p>
  </section>
</template>
