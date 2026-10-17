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

const pipelineCounts = computed(() => LEAD_STATUSES.map(status => ({
  status,
  label: leadStatusLabel(status),
  value: data.value?.byStatus?.[status] ?? 0,
  to: { path: '/leads', query: { status } },
})))
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
        <div class="stat-row border-t-0">
          <template
            v-for="item in followUpCounts"
            :key="item.label"
          >
            <NuxtLink
              v-if="canUseCrm"
              :to="item.to"
              class="stat"
            >
              <p class="stat-label">
                {{ item.label }}
              </p>
              <p
                class="stat-value"
                :class="{
                  'text-danger-700': item.tone === 'danger',
                  'text-warning-800': item.tone === 'warning',
                  'text-ink': item.tone === 'default',
                }"
              >
                {{ item.value }}
              </p>
            </NuxtLink>
            <div
              v-else
              class="stat"
            >
              <p class="stat-label">
                {{ item.label }}
              </p>
              <p
                class="stat-value"
                :class="{
                  'text-danger-700': item.tone === 'danger',
                  'text-warning-800': item.tone === 'warning',
                  'text-ink': item.tone === 'default',
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
          description="Confirmation calls appear when an intro is scheduled. After attendance, a conversion call is created so someone can join or close."
        />
        <ul
          v-else
          class="mt-4 divide-y divide-line"
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
                class="font-medium text-ink hover:text-brand-700"
              >
                {{ personName(task.lead) }}
              </NuxtLink>
              <p
                v-else
                class="font-medium text-ink"
              >
                {{ personName(task.lead) }}
              </p>
              <p class="text-sm text-muted">
                <a
                  v-if="task.lead?.phone"
                  :href="`tel:${task.lead.phone}`"
                  class="hover:text-ink"
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

      <div class="stat-row">
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
          hint="Unique people, not intro records"
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
            description="Scheduled intro classes will show here with the prospect’s name."
          />
          <ul
            v-else
            class="divide-y divide-line"
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
                  class="font-medium text-ink hover:text-brand-700"
                >
                  {{ personName(trial.lead) }}
                </NuxtLink>
                <p
                  v-else
                  class="font-medium text-ink"
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
          <ul class="divide-y divide-line text-sm">
            <li
              v-for="item in pipelineCounts"
              :key="item.status"
            >
              <NuxtLink
                v-if="canUseCrm"
                :to="item.to"
                class="flex min-h-11 items-center justify-between gap-4 py-2 text-muted hover:text-brand-700"
                :aria-label="`Open ${item.label} leads (${item.value})`"
              >
                <span>{{ item.label }}</span>
                <span class="font-medium tabular-nums text-ink">{{ item.value }}</span>
              </NuxtLink>
              <div
                v-else
                class="flex items-center justify-between gap-4 py-2"
              >
                <span class="text-muted">{{ item.label }}</span>
                <span class="font-medium tabular-nums text-ink">{{ item.value }}</span>
              </div>
            </li>
          </ul>
        </AppPanel>
      </div>
    </template>
  </section>
</template>
