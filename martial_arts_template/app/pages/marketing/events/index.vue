<script setup lang="ts">
import type { AcquisitionEventStatus } from '#shared/schemas/enums'
import { campaignStaffPath } from '#shared/utils/campaign'
import { eventStaffPath } from '#shared/utils/event'
import { eventStatusLabel, eventStatusTone } from '#shared/utils/labels'
import { toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'Acquisition Events',
})

interface EventRow {
  id: number
  title: string
  slug: string
  description: string | null
  status: AcquisitionEventStatus
  campaignId: number | null
  registrationOpensAt: string | Date | null
  registrationClosesAt: string | Date | null
  registrationManuallyClosed: boolean
  sessions: Array<{ id: number }>
  registrations: Array<{ id: number, lines: Array<{ attendance: string }> }>
  campaign?: { id: number, name: string } | null
}

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_ACQUISITION_EVENTS')))
const errorMessage = ref('')
const pending = ref(false)
const { data: events, error } = await useFetch<EventRow[]>('/api/marketing/events')
const { data: campaigns } = await useFetch<Array<{ id: number, name: string }>>('/api/marketing/campaigns')

const form = reactive({
  title: '',
  campaignId: '' as string | number,
})

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function windowLabel(item: EventRow) {
  const opens = item.registrationOpensAt ? toBusinessDateTime(new Date(item.registrationOpensAt).getTime()) : 'now'
  const closes = item.registrationClosesAt ? toBusinessDateTime(new Date(item.registrationClosesAt).getTime()) : 'manual'
  return `${opens} → ${closes}${item.registrationManuallyClosed ? ' · closed' : ''}`
}

async function create() {
  if (!canManage.value) {
    return
  }
  errorMessage.value = ''
  pending.value = true
  try {
    const created = await $fetch<{ id: number }>('/api/marketing/events', {
      method: 'POST',
      body: {
        title: form.title,
        campaignId: form.campaignId ? Number(form.campaignId) : undefined,
        status: 'DRAFT',
      },
    })
    await navigateTo(eventStaffPath(created.id))
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not create that event.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="Acquisition Events"
      description="Open houses and clinics. Registration is a roster until staff process it into Leads. Event attendance is not a Trial."
    />
    <AppAlert v-if="error">
      Could not load events.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <form
      v-if="canManage"
      class="panel grid gap-3 p-5 sm:grid-cols-3"
      @submit.prevent="create"
    >
      <AppField
        label="Title"
        required
      >
        <input
          v-model="form.title"
          class="control"
          required
        >
      </AppField>
      <AppField label="Campaign">
        <select
          v-model="form.campaignId"
          class="control"
        >
          <option value="">
            None
          </option>
          <option
            v-for="campaign in campaigns ?? []"
            :key="campaign.id"
            :value="campaign.id"
          >
            {{ campaign.name }}
          </option>
        </select>
      </AppField>
      <div class="flex items-end">
        <AppButton
          type="submit"
          :loading="pending"
        >
          Create and open
        </AppButton>
      </div>
    </form>

    <AppEmpty
      v-if="!(events ?? []).length"
      title="No Acquisition Events"
      description="Create an event, add sessions, then publish a public registration page."
    />

    <div
      v-else
      class="space-y-3 md:hidden"
    >
      <NuxtLink
        v-for="item in events"
        :key="item.id"
        :to="eventStaffPath(item.id)"
        class="panel block p-5"
      >
        <div class="flex min-w-0 flex-wrap items-start gap-2">
          <p class="min-w-0 break-words font-semibold text-navy-900">
            {{ item.title }}
          </p>
          <AppBadge
            class="ml-auto shrink-0"
            :tone="eventStatusTone(item.status)"
          >
            {{ eventStatusLabel(item.status) }}
          </AppBadge>
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ item.campaign?.name || 'No campaign' }}
          · {{ item.sessions.length }} session{{ item.sessions.length === 1 ? '' : 's' }}
          · {{ item.registrations.length }} registration{{ item.registrations.length === 1 ? '' : 's' }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ windowLabel(item) }}
        </p>
      </NuxtLink>
    </div>

    <div
      v-if="(events ?? []).length"
      class="panel hidden overflow-x-auto md:block"
    >
      <table class="data-table">
        <thead class="border-b border-line bg-canvas text-muted">
          <tr>
            <th>Event</th>
            <th>Status</th>
            <th>Campaign</th>
            <th>Sessions</th>
            <th>Registrations</th>
            <th>Registration window</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in events ?? []"
            :key="item.id"
          >
            <td>
              <NuxtLink
                :to="eventStaffPath(item.id)"
                class="font-medium text-navy-900 hover:text-brand-700"
              >
                {{ item.title }}
              </NuxtLink>
              <p class="text-xs text-muted">
                /events/{{ item.slug }}
              </p>
            </td>
            <td>
              <AppBadge :tone="eventStatusTone(item.status)">
                {{ eventStatusLabel(item.status) }}
              </AppBadge>
            </td>
            <td>
              <NuxtLink
                v-if="item.campaign?.id"
                :to="campaignStaffPath(item.campaign.id)"
                class="text-sm font-medium text-brand-700 hover:text-brand-600"
              >
                {{ item.campaign.name }}
              </NuxtLink>
              <span
                v-else
                class="text-muted"
              >None</span>
            </td>
            <td>{{ item.sessions.length }}</td>
            <td>{{ item.registrations.length }}</td>
            <td class="text-sm text-muted">
              {{ windowLabel(item) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
