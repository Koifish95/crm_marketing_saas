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
  return value === 'ready' || value === 'sending' ? value : 'needs_you'
})

const { data, error, refresh } = await useFetch<Desk>('/api/prospects/desk', {
  query: computed(() => ({ view: view.value })),
})

const state = ref('')
const starting = ref(false)
const resuming = ref(false)
const formError = ref('')
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
  if (view.value === 'ready') {
    return {
      title: 'No academies are waiting',
      description: 'Run discovery for a practice state. Ready should stay larger than what you send.',
    }
  }
  if (view.value === 'sending') {
    return {
      title: 'Nothing is in the sequence',
      description: 'Qualified academies move here when a send window and the daily cap allow a message.',
    }
  }
  const ready = data.value?.ready ?? 0
  return {
    title: 'Nothing needs you',
    description: ready > 0
      ? `${ready} ${ready === 1 ? 'academy is' : 'academies are'} Ready. Open that list to see them. Quiet follow-ups stay in Sending.`
      : 'Replies and the sender pause show up here. Quiet follow-ups stay in Sending.',
  }
})

const viewLabel = computed(() => {
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
    ? 'rounded-md border-2 px-4 py-3 text-left'
    : 'rounded-md border px-4 py-3 text-left'
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
    <AppPageHeader
      title="Prospects"
      description="Academies are stored here before anyone is emailed. The daily cap limits what goes out."
    >
      <template #actions>
        <NuxtLink
          class="text-sm"
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
    <AppAlert v-else-if="data && !data.mailboxReady">
      Connect the mailbox and add the postal address before anything sends.
    </AppAlert>
    <AppAlert v-else-if="data?.capReached">
      Today's cap of {{ data.sendingCap }} is reached. Ready academies stay in the backlog.
    </AppAlert>
    <AppAlert v-else-if="data?.blockReason && data.blockReason !== 'Outside the weekday send window.'">
      {{ data.blockReason }}
    </AppAlert>
    <div class="grid gap-3 sm:grid-cols-4">
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
      <div class="rounded-md border px-4 py-3">
        <p class="text-sm text-muted">
          Stored
        </p>
        <p class="text-2xl">
          {{ data?.stored ?? '—' }}
        </p>
      </div>
    </div>
    <AppPanel title="Discovery">
      <form
        class="flex flex-wrap items-end gap-3"
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
        <AppButton
          type="submit"
          :loading="starting"
        >
          Run discovery
        </AppButton>
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
    <p class="text-sm text-muted">
      Showing {{ viewLabel }}
    </p>
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
        </p>
        <p class="record-item-meta">
          {{ item.email || item.website || 'No public contact yet' }}
        </p>
      </li>
    </ul>
  </section>
</template>
