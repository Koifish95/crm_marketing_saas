<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales', 'prospect-desk'],
})

useHead({
  title: 'Prospects',
})

type DeskItem = {
  id: number
  name: string
  city: string | null
  state: string | null
  email: string | null
  website: string | null
  outreachStatus: string
  why: string | null
  step: number | null
  subject: string | null
  firstEmail: { subject: string, body: string } | null
  emailSourceUrl: string | null
  rejectionReason: string | null
}

type Run = {
  id: number
  stateCode: string
  status: string
  storedCount: number
  rejectedCount: number
  detail: string | null
  error: string | null
}

type Desk = {
  stored: number
  rejected: number
  rejectedByReason: Record<string, number>
  states: string[]
  awaitingApproval: number
  ready: number
  sendingToday: number
  sendingCap: number
  needsYou: number
  senderPaused: boolean
  senderPausedReason: string | null
  mailboxReady: boolean
  capReached: boolean
  blockReason: string | null
  view: string
  items: DeskItem[]
  run: Run | null
  config: {
    practiceStates: string[]
  }
}

const route = useRoute()
const view = computed(() => {
  const value = String(route.query.view ?? 'needs_you')
  return value === 'awaiting_approval' || value === 'ready' || value === 'sending' || value === 'all' ? value : 'needs_you'
})
const filterState = computed(() => String(route.query.state ?? ''))
const filterReason = computed(() => String(route.query.reason ?? ''))

const { data, error, refresh } = await useFetch<Desk>('/api/prospects/desk', {
  query: computed(() => ({ view: view.value, state: filterState.value, reason: filterReason.value })),
})

const state = ref('')
const starting = ref(false)
const resuming = ref(false)
const formError = ref('')
const notice = ref('')
const run = ref<Run | null>(null)
let pollTimer: ReturnType<typeof setInterval> | undefined

watch(data, (value) => {
  if (!state.value && value?.config.practiceStates[0]) {
    state.value = value.config.practiceStates[0]
  }
  if (value?.run && !run.value) {
    run.value = value.run
  }
}, { immediate: true })

const emptyCopy = computed(() => {
  if (view.value === 'needs_you' && data.value?.senderPaused) {
    return {
      title: 'Sending is paused',
      description: data.value.senderPausedReason || 'Check the bounces, then resume sending.',
    }
  }
  if (view.value === 'all') {
    return {
      title: 'No prospects match',
      description: 'Run discovery for a practice state, or clear the filters.',
    }
  }
  if (view.value === 'awaiting_approval') {
    return {
      title: 'Nothing is waiting for your OK',
      description: 'Run discovery for a practice state. New academies wait here until you approve them.',
    }
  }
  if (view.value === 'ready') {
    return {
      title: 'No approved academies are waiting',
      description: 'Approve academies from Awaiting your OK. Approved academies wait here for the send window.',
    }
  }
  if (view.value === 'sending') {
    return {
      title: 'Nothing is in the sequence',
      description: 'Qualified academies move here when a send window and the daily cap allow a message.',
    }
  }
  const waiting = data.value?.awaitingApproval ?? 0
  return {
    title: 'Nothing needs you',
    description: waiting > 0
      ? `${waiting} ${waiting === 1 ? 'academy is' : 'academies are'} waiting for your OK. Open that list to review them. Quiet follow-ups stay in Sending.`
      : 'Replies and the sender pause show up here. Quiet follow-ups stay in Sending.',
  }
})

const viewLabel = computed(() => {
  if (view.value === 'all') {
    return 'All prospects'
  }
  if (view.value === 'awaiting_approval') {
    return 'Awaiting your OK'
  }
  if (view.value === 'ready') {
    return 'Ready'
  }
  if (view.value === 'sending') {
    return 'Sending'
  }
  return 'Needs you'
})

function cardClass(name: string) {
  return view.value === name
    ? 'stat-cell stat-link bg-brand-50 text-left ring-1 ring-inset ring-brand-500'
    : 'stat-cell stat-link text-left'
}

function setFilter(key: 'state' | 'reason', value: string) {
  return navigateTo({ path: '/prospects', query: { ...route.query, [key]: value || undefined } })
}

function label(value: string) {
  const text = value.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function selectView(next: string) {
  return navigateTo({ path: '/prospects', query: next === 'needs_you' ? {} : { view: next } })
}

async function pollRun(id: number) {
  const current = await $fetch<Run>(`/api/prospects/runs/${id}`)
  run.value = current
  if (current.status === 'running') {
    return
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
  await refresh()
}

async function discover() {
  formError.value = ''
  starting.value = true
  try {
    const created = await $fetch<Run>('/api/prospects/discover', {
      method: 'POST',
      body: { state: state.value },
    })
    run.value = created
    if (pollTimer) {
      clearInterval(pollTimer)
    }
    pollTimer = setInterval(() => {
      void pollRun(created.id)
    }, 2000)
    await pollRun(created.id)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Discovery did not start.'
  } finally {
    starting.value = false
  }
}

const acting = ref(false)
const confirmingBulk = ref(false)

function errorMessage(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string } }
  return err.data?.message || fallback
}

async function approve(ids: number[]) {
  formError.value = ''
  notice.value = ''
  acting.value = true
  try {
    const result = await $fetch<{ approved: number[], skipped: number[] }>('/api/prospects/approve', {
      method: 'POST',
      body: { ids },
    })
    notice.value = `Approved ${result.approved.length} ${result.approved.length === 1 ? 'academy' : 'academies'}. All three touches are cleared to send.`
    confirmingBulk.value = false
    await refresh()
  } catch (caught: unknown) {
    formError.value = errorMessage(caught, 'Nothing was approved.')
  } finally {
    acting.value = false
  }
}

async function act(id: number, action: 'skip' | 'do-not-contact') {
  formError.value = ''
  notice.value = ''
  acting.value = true
  try {
    await $fetch(`/api/prospects/${id}/${action}`, { method: 'POST' })
    notice.value = action === 'skip' ? 'Skipped. Nothing will be sent.' : 'Marked do not contact. Nothing will be sent.'
    confirmingBulk.value = false
    await refresh()
  } catch (caught: unknown) {
    formError.value = errorMessage(caught, 'That action failed.')
  } finally {
    acting.value = false
  }
}

async function resume() {
  formError.value = ''
  resuming.value = true
  try {
    await $fetch('/api/prospects/resume', { method: 'POST' })
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Sending stayed paused.'
  } finally {
    resuming.value = false
  }
}

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
})
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-3">
      <AppPageHeader
        title="Prospects"
        description="Academies are stored here before anyone is emailed. Nothing sends until you approve it, and the daily cap limits what goes out."
      >
        <template #actions>
          <NuxtLink
            class="btn btn-secondary"
            to="/settings/prospects"
          >
            Desk settings
          </NuxtLink>
        </template>
      </AppPageHeader>
      <AppAlert v-if="error || formError">
        {{ formError || 'Could not load the prospect desk.' }}
      </AppAlert>
      <AppAlert
        v-if="notice"
        tone="success"
      >
        {{ notice }}
      </AppAlert>
      <AppAlert
        v-if="data?.senderPaused"
        tone="warning"
      >
        Sending is paused. {{ data.senderPausedReason || 'Resume when you have checked the bounces.' }}
        <AppButton
          class="ml-3"
          type="button"
          variant="secondary"
          :loading="resuming"
          @click="resume"
        >
          Resume sending
        </AppButton>
      </AppAlert>
      <AppAlert
        v-else-if="data && !data.mailboxReady"
        tone="info"
      >
        Connect the mailbox and add the postal address before anything sends.
      </AppAlert>
      <AppAlert v-else-if="data?.capReached">
        Today's cap of {{ data.sendingCap }} is reached. Approved academies stay in the backlog.
      </AppAlert>
      <AppAlert v-else-if="data?.blockReason && data.blockReason !== 'Outside the weekday send window.'">
        {{ data.blockReason }}
      </AppAlert>
    </div>
    <div class="stat-grid sm:!grid-cols-5">
      <button
        type="button"
        :class="cardClass('needs_you')"
        :aria-pressed="view === 'needs_you'"
        @click="selectView('needs_you')"
      >
        <p class="text-sm text-muted">
          Needs you
        </p>
        <p class="text-2xl">
          {{ data?.needsYou ?? '—' }}
        </p>
      </button>
      <button
        type="button"
        :class="cardClass('awaiting_approval')"
        :aria-pressed="view === 'awaiting_approval'"
        @click="selectView('awaiting_approval')"
      >
        <p class="text-sm text-muted">
          Awaiting your OK
        </p>
        <p class="text-2xl">
          {{ data?.awaitingApproval ?? '—' }}
        </p>
      </button>
      <button
        type="button"
        :class="cardClass('ready')"
        :aria-pressed="view === 'ready'"
        @click="selectView('ready')"
      >
        <p class="text-sm text-muted">
          Ready
        </p>
        <p class="text-2xl">
          {{ data?.ready ?? '—' }}
        </p>
      </button>
      <button
        type="button"
        :class="cardClass('sending')"
        :aria-pressed="view === 'sending'"
        @click="selectView('sending')"
      >
        <p class="text-sm text-muted">
          Sending today
        </p>
        <p class="text-2xl">
          {{ data ? `${data.sendingToday} / ${data.sendingCap}` : '—' }}
        </p>
      </button>
      <button
        type="button"
        :class="cardClass('all')"
        :aria-pressed="view === 'all'"
        @click="selectView('all')"
      >
        <p class="text-sm text-muted">
          All prospects
        </p>
        <p class="text-2xl">
          {{ data?.stored ?? '—' }}
        </p>
      </button>
    </div>
    <AppPanel title="Discovery">
      <form
        class="grid gap-4 sm:grid-cols-2"
        @submit.prevent="discover"
      >
        <AppField label="Practice state">
          <select
            v-model="state"
            class="control"
          >
            <option
              v-for="code in data?.config.practiceStates ?? []"
              :key="code"
              :value="code"
            >
              {{ code }}
            </option>
          </select>
        </AppField>
        <div class="sm:col-span-2 form-actions">
          <AppButton
            type="submit"
            :loading="starting"
          >
            Run discovery
          </AppButton>
        </div>
      </form>
      <p
        v-if="run"
        class="mt-3 text-sm text-muted"
      >
        {{ run.stateCode }} · {{ run.status }}
        · stored {{ run.storedCount }}
        · rejected {{ run.rejectedCount }}
        <span v-if="run.detail">
          · {{ run.detail }}
        </span>
        <span v-if="run.error">
          · {{ run.error }}
        </span>
      </p>
    </AppPanel>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted">
        Showing {{ viewLabel }}
      </p>
      <div
        v-if="view === 'all' && data"
        class="flex flex-wrap gap-3"
      >
        <select
          class="control"
          aria-label="Filter by state"
          :value="filterState"
          @change="setFilter('state', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">
            Any state
          </option>
          <option
            v-for="option in data.states"
            :key="option"
            :value="option"
          >
            {{ label(option) }}
          </option>
        </select>
        <select
          class="control"
          aria-label="Filter by reason"
          :value="filterReason"
          @change="setFilter('reason', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">
            Any reason
          </option>
          <option
            v-for="(count, option) in data.rejectedByReason"
            :key="option"
            :value="option"
          >
            {{ label(option) }} ({{ count }})
          </option>
        </select>
      </div>
      <AppButton
        v-if="view === 'awaiting_approval' && data?.items.length && !confirmingBulk"
        type="button"
        @click="confirmingBulk = true"
      >
        Approve all {{ data.items.length }}
      </AppButton>
    </div>
    <AppAlert
      v-if="confirmingBulk && data"
      tone="warning"
    >
      Approve {{ data.items.length }} {{ data.items.length === 1 ? 'academy' : 'academies' }}? Each one gets all three touches without asking again.
      <AppButton
        class="ml-3"
        type="button"
        :loading="acting"
        @click="approve(data.items.map(item => item.id))"
      >
        Yes, approve {{ data.items.length }}
      </AppButton>
      <AppButton
        class="ml-2"
        type="button"
        variant="secondary"
        :disabled="acting"
        @click="confirmingBulk = false"
      >
        Cancel
      </AppButton>
    </AppAlert>
    <AppEmpty
      v-if="data && !data.items.length"
      :title="emptyCopy.title"
      :description="emptyCopy.description"
    />
    <ul
      v-else-if="data"
      class="record-list"
    >
      <li
        v-for="item in data.items"
        :key="item.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/prospects/${item.id}`"
          class="record-item-title"
        >
          {{ item.name }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ [item.city, item.state].filter(Boolean).join(', ') || 'No place' }}
          <span v-if="item.step">
            · Touch {{ item.step }}
          </span>
          <span v-if="item.why">
            · {{ item.why }}
          </span>
          <span v-if="view === 'all'">
            · {{ label(item.outreachStatus) }}<template v-if="item.rejectionReason">: {{ label(item.rejectionReason) }}</template>
          </span>
        </p>
        <p class="record-item-meta">
          {{ item.email || item.website || 'No public contact yet' }}
          <template v-if="item.rejectionReason && item.email && item.emailSourceUrl">
            · found at {{ item.emailSourceUrl }}
          </template>
        </p>
        <template v-if="item.firstEmail">
          <div class="mt-3 rounded border border-gray-200 p-3 text-sm">
            <p class="font-medium">
              First email: {{ item.firstEmail.subject }}
            </p>
            <p class="mt-2 whitespace-pre-wrap">
              {{ item.firstEmail.body }}
            </p>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <AppButton
              type="button"
              :disabled="acting"
              @click="approve([item.id])"
            >
              Approve
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              :disabled="acting"
              @click="act(item.id, 'skip')"
            >
              Skip
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              :disabled="acting"
              @click="act(item.id, 'do-not-contact')"
            >
              Do not contact
            </AppButton>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>
