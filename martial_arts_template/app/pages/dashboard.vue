<script setup lang="ts">
import { centsToDollarString } from '#shared/utils/money'
import { toBusinessDateTime } from '#shared/utils/time'
import {
  DUE_STATE_LABELS,
  LEAD_STATUSES,
  dueStateTone,
  leadStatusLabel,
  personName,
} from '#shared/utils/labels'

definePageMeta({
  layout: 'internal',
  middleware: 'auth',
})

useHead({
  title: 'Dashboard',
})

const { user } = useUserSession()
const canUseCrm = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'STAFF')
const { data, error, pending } = await useFetch('/api/dashboard')

const followUpCounts = computed(() => [
  { label: 'Overdue', value: data.value?.followUp?.overdue ?? 0, tone: 'danger' as const, to: '/tasks?view=overdue' },
  { label: 'Due today', value: data.value?.followUp?.dueToday ?? 0, tone: 'warning' as const, to: '/tasks?view=due_today' },
  { label: 'Upcoming', value: data.value?.followUp?.upcoming ?? 0, tone: 'default' as const, to: '/tasks?view=upcoming' },
])
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Dashboard"
      description="What needs attention in acquisition right now."
    />

    <AppAlert v-if="error">
      Could not load the dashboard. Refresh and try again.
    </AppAlert>

    <p
      v-else-if="pending && !data"
      class="text-sm text-muted"
    >
      Loading dashboard…
    </p>

    <template v-else>
      <AppPanel
        title="Follow-up"
        description="Open confirmation calls. Overdue, due today, and upcoming are mutually exclusive."
      >
        <template
          v-if="canUseCrm"
          #actions
        >
          <NuxtLink
            to="/tasks"
            class="btn btn-subtle text-sm"
          >
            Open queue
          </NuxtLink>
        </template>
        <div class="panel-list grid gap-3 sm:grid-cols-3">
          <template v-if="canUseCrm">
            <NuxtLink
              v-for="item in followUpCounts"
              :key="item.label"
              :to="item.to"
              class="rounded-md border border-line px-4 py-3 hover:border-navy-600/30"
            >
              <p class="text-sm text-muted">
                {{ item.label }}
              </p>
              <p
                class="mt-1 font-display text-2xl font-semibold"
                :class="{
                  'text-danger-700': item.tone === 'danger',
                  'text-warning-800': item.tone === 'warning',
                  'text-navy-900': item.tone === 'default',
                }"
              >
                {{ item.value }}
              </p>
            </NuxtLink>
          </template>
          <template v-else>
            <div
              v-for="item in followUpCounts"
              :key="item.label"
              class="rounded-md border border-line px-4 py-3"
            >
              <p class="text-sm text-muted">
                {{ item.label }}
              </p>
              <p
                class="mt-1 font-display text-2xl font-semibold"
                :class="{
                  'text-danger-700': item.tone === 'danger',
                  'text-warning-800': item.tone === 'warning',
                  'text-navy-900': item.tone === 'default',
                }"
              >
                {{ item.value }}
              </p>
            </div>
          </template>
        </div>
        <AppEmpty
          v-if="!data?.followUp?.priority?.length"
          class="mt-4"
          bare
          title="No open follow-up calls"
          description="New confirmation calls appear here when an intro is scheduled."
        />
        <ul
          v-else
          class="panel-list mt-4 divide-y divide-line"
        >
          <li
            v-for="task in data.followUp.priority"
            :key="task.id"
            class="kv-row flex-wrap py-3 first:pt-0 last:pb-0"
          >
            <div class="min-w-0">
              <NuxtLink
                v-if="canUseCrm"
                :to="`/leads/${task.leadId}`"
                class="font-medium text-navy-900 hover:text-brand-700"
              >
                {{ personName(task.lead) }}
              </NuxtLink>
              <p
                v-else
                class="font-medium text-navy-900"
              >
                {{ personName(task.lead) }}
              </p>
              <p class="text-sm text-muted">
                <a
                  v-if="task.lead?.phone"
                  :href="`tel:${task.lead.phone}`"
                  class="hover:text-navy-900"
                >{{ task.lead.phone }}</a>
                <span v-else>No phone</span>
                · due {{ toBusinessDateTime(new Date(task.dueAt).getTime()) }}
              </p>
            </div>
            <AppBadge
              v-if="task.dueState"
              class="shrink-0"
              :tone="dueStateTone(task.dueState)"
            >
              {{ DUE_STATE_LABELS[task.dueState] }}
            </AppBadge>
          </li>
        </ul>
      </AppPanel>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AppStat label="Households this month">
          {{ data?.householdsThisMonth ?? data?.leadsThisMonth ?? 0 }}
        </AppStat>
        <AppStat
          label="Prospective members"
          hint="Unique people this month"
        >
          {{ data?.prospectiveMembersThisMonth ?? 0 }}
        </AppStat>
        <AppStat
          label="Attended this month"
          hint="Unique people, not trial rows"
        >
          {{ data?.attendedThisMonth ?? 0 }}
        </AppStat>
        <AppStat
          label="Conversions this month"
          :hint="data?.includeFinancial && data?.newMrrCents != null
            ? `$${centsToDollarString(data.newMrrCents)} converted MRR this month`
            : 'New members this month'"
        >
          {{ data?.conversionsThisMonth ?? data?.joinsThisMonth ?? 0 }}
        </AppStat>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <AppPanel title="Upcoming intros">
          <AppEmpty
            v-if="!data?.upcomingTrials?.length"
            bare
            title="No upcoming intros"
            description="Scheduled trials will show here with the prospect’s name."
          />
          <ul
            v-else
            class="panel-list divide-y divide-line"
          >
            <li
              v-for="trial in data.upcomingTrials"
              :key="trial.id"
              class="kv-row flex-wrap py-3 first:pt-0 last:pb-0"
            >
              <div class="min-w-0">
                <NuxtLink
                  v-if="canUseCrm"
                  :to="`/leads/${trial.leadId}`"
                  class="font-medium text-navy-900 hover:text-brand-700"
                >
                  {{ personName(trial.lead) }}
                </NuxtLink>
                <p
                  v-else
                  class="font-medium text-navy-900"
                >
                  {{ personName(trial.lead) }}
                </p>
                <p class="text-sm text-muted">
                  {{ toBusinessDateTime(new Date(trial.scheduledAt).getTime()) }}
                  <span v-if="trial.label"> · {{ trial.label }}</span>
                </p>
              </div>
            </li>
          </ul>
        </AppPanel>

        <AppPanel title="Pipeline by status">
          <dl class="panel-list grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 text-sm">
            <template
              v-for="status in LEAD_STATUSES"
              :key="status"
            >
              <dt class="text-muted">
                {{ leadStatusLabel(status) }}
              </dt>
              <dd class="font-medium tabular-nums text-navy-900">
                {{ data?.byStatus?.[status] ?? 0 }}
              </dd>
            </template>
          </dl>
        </AppPanel>
      </div>
    </template>
  </section>
</template>
