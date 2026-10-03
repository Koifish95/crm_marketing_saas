<script setup lang="ts">
import { prospectLaneLabel, prospectPriorityLabel, prospectStatusLabel } from '#shared/utils/prospect'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales', 'prospect-desk'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Message = {
  id: number
  step: number
  subject: string
  body: string
  delivery: string
  sentAt: string | Date | null
  deliveredAt: string | Date | null
  bouncedAt: string | Date | null
  openedAt: string | Date | null
  replyExcerpt: string | null
  replyAt: string | Date | null
}

type Observation = {
  id: number
  source: string
  externalId: string
  query: string | null
  sourceUrl: string | null
  rawRef: string | null
  discoveredAt: string | Date
}

type Prospect = {
  id: number
  name: string
  website: string | null
  domainKey: string | null
  city: string | null
  state: string | null
  discipline: string | null
  email: string | null
  emailSourceUrl: string | null
  phone: string | null
  outreachStatus: string
  status: string
  priority: string
  lane: string
  readiness: string
  notes: string | null
  possibleDuplicateProspectId: number | null
  duplicateName: string | null
  salesAccountId: number | null
  salesContactId: number | null
  salesOpportunityId: number | null
  observations: Observation[]
  messages: Message[]
}

const { data: prospect, error, pending, refresh } = await useFetch<Prospect>(() => `/api/prospects/${id.value}`)
const notice = ref('')
const formError = ref('')
const saving = ref(false)

useHead({
  title: computed(() => prospect.value?.name || 'Prospect'),
})

const canPromote = computed(() => {
  const status = prospect.value?.status
  return status === 'new' || status === 'review' || status === 'skipped'
})

async function act(path: string, success: string) {
  notice.value = ''
  formError.value = ''
  saving.value = true
  try {
    await $fetch(path, { method: 'POST' })
    await refresh()
    notice.value = success
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'That action failed.'
  } finally {
    saving.value = false
  }
}

function formatWhen(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString()
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !prospect">
    <template #header>
      <p class="record-kind">
        Prospect
      </p>
      <h1 class="record-identity-name">
        {{ prospect?.name || 'Prospect' }}
      </h1>
      <p class="record-meta">
        <template v-if="prospect">
          {{ prospectStatusLabel(prospect.status) }}
          · {{ prospect.readiness }}
          · {{ prospectPriorityLabel(prospect.priority) }}
          · {{ prospectLaneLabel(prospect.lane) }}
          <span v-if="prospect.city || prospect.state">
            · {{ [prospect.city, prospect.state].filter(Boolean).join(', ') }}
          </span>
        </template>
      </p>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this prospect.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <div
      v-if="prospect"
      class="mb-6 flex flex-wrap gap-2"
    >
      <AppButton
        v-if="canPromote"
        type="button"
        :loading="saving"
        @click="act(`/api/prospects/${prospect.id}/promote`, 'Promoted into Sales. No email was sent.')"
      >
        Promote
      </AppButton>
      <AppButton
        v-if="prospect.status === 'new' || prospect.status === 'review'"
        type="button"
        variant="secondary"
        :loading="saving"
        @click="act(`/api/prospects/${prospect.id}/skip`, 'Skipped.')"
      >
        Skip
      </AppButton>
      <AppButton
        v-if="prospect.outreachStatus === 'ready' || prospect.outreachStatus === 'active' || prospect.outreachStatus === 'queued'"
        type="button"
        variant="secondary"
        :loading="saving"
        @click="act(`/api/prospects/${prospect.id}/pause`, 'Paused. No further messages will send.')"
      >
        Pause
      </AppButton>
      <AppButton
        v-if="prospect.status !== 'do_not_contact'"
        type="button"
        variant="secondary"
        :loading="saving"
        @click="act(`/api/prospects/${prospect.id}/do-not-contact`, prospect.status === 'promoted' ? 'Sales company marked do not contact.' : 'Marked do not contact.')"
      >
        Do not contact
      </AppButton>
      <AppButton
        v-if="prospect.status === 'skipped' || prospect.status === 'do_not_contact'"
        type="button"
        variant="secondary"
        :loading="saving"
        @click="act(`/api/prospects/${prospect.id}/review`, 'Returned to review.')"
      >
        Return to review
      </AppButton>
      <NuxtLink
        v-if="prospect.salesAccountId"
        class="text-sm"
        :to="`/companies/${prospect.salesAccountId}`"
      >
        Open company
      </NuxtLink>
      <NuxtLink
        v-if="prospect.salesOpportunityId"
        class="text-sm"
        :to="`/opportunities/${prospect.salesOpportunityId}`"
      >
        Open opportunity
      </NuxtLink>
    </div>
    <AppPanel
      v-if="prospect"
      title="Identity"
    >
      <dl class="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-muted">
            Website
          </dt>
          <dd>{{ prospect.website || '—' }}</dd>
        </div>
        <div>
          <dt class="text-muted">
            Domain
          </dt>
          <dd>{{ prospect.domainKey || '—' }}</dd>
        </div>
        <div>
          <dt class="text-muted">
            Email
          </dt>
          <dd>{{ prospect.email || '—' }}</dd>
        </div>
        <div>
          <dt class="text-muted">
            Email found on
          </dt>
          <dd>
            <a
              v-if="prospect.emailSourceUrl"
              :href="prospect.emailSourceUrl"
              rel="noopener"
              target="_blank"
            >
              {{ prospect.emailSourceUrl }}
            </a>
            <template v-else>
              —
            </template>
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            Phone
          </dt>
          <dd>{{ prospect.phone || '—' }}</dd>
        </div>
        <div>
          <dt class="text-muted">
            Discipline
          </dt>
          <dd>{{ prospect.discipline || '—' }}</dd>
        </div>
        <div>
          <dt class="text-muted">
            Possible duplicate
          </dt>
          <dd>
            <NuxtLink
              v-if="prospect.possibleDuplicateProspectId"
              :to="`/prospects/${prospect.possibleDuplicateProspectId}`"
            >
              {{ prospect.duplicateName || `Prospect #${prospect.possibleDuplicateProspectId}` }}
            </NuxtLink>
            <template v-else>
              —
            </template>
          </dd>
        </div>
      </dl>
      <p
        v-if="prospect.notes"
        class="mt-4 text-sm"
      >
        {{ prospect.notes }}
      </p>
    </AppPanel>
    <AppPanel
      v-if="prospect"
      class="mt-6"
      title="Messages"
    >
      <AppEmpty
        v-if="!prospect.messages.length"
        title="No messages yet"
        description="This academy is not in a sequence. Opens stay unavailable until a public base URL is saved."
      />
      <ol
        v-else
        class="space-y-4 text-sm"
      >
        <li
          v-for="message in prospect.messages"
          :key="message.id"
          class="space-y-1"
        >
          <p class="font-medium">
            Touch {{ message.step }} · {{ message.subject }}
          </p>
          <p class="text-muted">
            {{ message.delivery }}
            <span v-if="message.sentAt">
              · Sent {{ formatWhen(message.sentAt) }}
            </span>
            <span v-if="message.deliveredAt">
              · Delivered {{ formatWhen(message.deliveredAt) }}
            </span>
            <span v-if="message.bouncedAt">
              · Bounced {{ formatWhen(message.bouncedAt) }}
            </span>
            <span v-if="message.openedAt">
              · Opened {{ formatWhen(message.openedAt) }} (unreliable)
            </span>
            <span v-else>
              · Opened unavailable
            </span>
          </p>
          <p class="whitespace-pre-wrap">
            {{ message.body }}
          </p>
          <p
            v-if="message.replyExcerpt"
            class="text-muted"
          >
            Reply: {{ message.replyExcerpt }}
          </p>
        </li>
      </ol>
    </AppPanel>
    <AppPanel
      v-if="prospect"
      class="mt-6"
      title="Provenance"
    >
      <AppEmpty
        v-if="!prospect.observations.length"
        title="No observations"
        description="This prospect has no stored source yet."
      />
      <ul
        v-else
        class="space-y-3 text-sm"
      >
        <li
          v-for="observation in prospect.observations"
          :key="observation.id"
        >
          <p>
            {{ observation.source }}
            · {{ observation.externalId }}
            <span v-if="observation.discoveredAt">
              · {{ formatWhen(observation.discoveredAt) }}
            </span>
          </p>
          <p class="text-muted">
            {{ observation.query || 'No query recorded' }}
            <span v-if="observation.rawRef">
              · {{ observation.rawRef }}
            </span>
          </p>
          <a
            v-if="observation.sourceUrl"
            :href="observation.sourceUrl"
            rel="noopener"
            target="_blank"
          >
            {{ observation.sourceUrl }}
          </a>
        </li>
      </ul>
    </AppPanel>
  </AppRecordWorkspace>
</template>
