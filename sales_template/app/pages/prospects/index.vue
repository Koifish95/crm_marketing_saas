<script setup lang="ts">
import {
  PROSPECT_LANES,
  PROSPECT_PRIORITIES,
  PROSPECT_STATUSES,
  prospectLaneLabel,
  prospectPriorityLabel,
  prospectStatusLabel,
} from '#shared/utils/prospect'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Prospects',
})

type Prospect = {
  id: number
  name: string
  website: string | null
  city: string | null
  state: string | null
  discipline: string | null
  email: string | null
  phone: string | null
  status: string
  priority: string
  lane: string
  readiness: string
  possibleDuplicateProspectId: number | null
}

type Counts = {
  new: number
  review: number
  promoted: number
  skipped: number
  do_not_contact: number
  total: number
}

const search = ref('')
const state = ref('UT')
const status = ref('review')
const priority = ref('')
const lane = ref('')
const creating = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const name = ref('')
const website = ref('')
const city = ref('')
const prospectState = ref('UT')
const email = ref('')
const phone = ref('')
const discipline = ref('')

const query = computed(() => ({
  search: search.value || undefined,
  state: state.value || undefined,
  status: status.value || undefined,
  priority: priority.value || undefined,
  lane: lane.value || undefined,
}))

const { data, error, pending, refresh } = await useFetch<{ items: Prospect[], counts: Counts }>('/api/prospects', {
  query,
})

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await $fetch<{ prospect: Prospect }>('/api/prospects', {
      method: 'POST',
      body: {
        name: name.value,
        website: website.value || undefined,
        city: city.value || undefined,
        state: prospectState.value || undefined,
        email: email.value || undefined,
        phone: phone.value || undefined,
        discipline: discipline.value || undefined,
        lane: 'local',
      },
    })
    name.value = ''
    website.value = ''
    city.value = ''
    email.value = ''
    phone.value = ''
    discipline.value = ''
    await refresh()
    await navigateTo(`/prospects/${created.prospect.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not add that prospect.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Prospect pool"
      description="Discovered academies waiting for review. Promote sends one academy into Sales. Nothing here is emailed automatically."
    >
      <template #actions>
        <AppButton
          type="button"
          variant="secondary"
          @click="creating = !creating"
        >
          {{ creating ? 'Cancel' : 'Add prospect' }}
        </AppButton>
      </template>
    </AppPageHeader>
    <p
      v-if="data?.counts"
      class="text-sm text-muted"
    >
      {{ data.counts.total }} total
      · {{ data.counts.review }} review
      · {{ data.counts.new }} new
      · {{ data.counts.promoted }} promoted
      · {{ data.counts.skipped }} skipped
      · {{ data.counts.do_not_contact }} do not contact
    </p>
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load prospects.' }}
    </AppAlert>
    <AppPanel
      v-if="creating"
      title="Add prospect"
    >
      <form
        class="grid gap-3 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AppField
          label="Academy name"
          required
        >
          <input
            v-model="name"
            class="control"
            required
          >
        </AppField>
        <AppField label="Website">
          <input
            v-model="website"
            class="control"
          >
        </AppField>
        <AppField label="City">
          <input
            v-model="city"
            class="control"
          >
        </AppField>
        <AppField label="State">
          <input
            v-model="prospectState"
            class="control"
          >
        </AppField>
        <AppField label="Email">
          <input
            v-model="email"
            class="control"
            type="email"
          >
        </AppField>
        <AppField label="Phone">
          <input
            v-model="phone"
            class="control"
          >
        </AppField>
        <AppField label="Discipline">
          <input
            v-model="discipline"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Save prospect
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <AppField label="Search">
        <input
          v-model="search"
          class="control"
          placeholder="Name, city, site, email"
        >
      </AppField>
      <AppField label="State">
        <input
          v-model="state"
          class="control"
          placeholder="UT"
        >
      </AppField>
      <AppField label="Status">
        <select
          v-model="status"
          class="control"
        >
          <option value="">
            All
          </option>
          <option
            v-for="code in PROSPECT_STATUSES"
            :key="code"
            :value="code"
          >
            {{ prospectStatusLabel(code) }}
          </option>
        </select>
      </AppField>
      <AppField label="Priority">
        <select
          v-model="priority"
          class="control"
        >
          <option value="">
            All
          </option>
          <option
            v-for="code in PROSPECT_PRIORITIES"
            :key="code"
            :value="code"
          >
            {{ prospectPriorityLabel(code) }}
          </option>
        </select>
      </AppField>
      <AppField label="Lane">
        <select
          v-model="lane"
          class="control"
        >
          <option value="">
            All
          </option>
          <option
            v-for="code in PROSPECT_LANES"
            :key="code"
            :value="code"
          >
            {{ prospectLaneLabel(code) }}
          </option>
        </select>
      </AppField>
    </div>
    <p
      v-if="pending && !data"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <AppEmpty
      v-else-if="!data?.items.length"
      title="No prospects in this view"
      description="Change the filters, add a prospect, or run one-state discovery."
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="prospect in data.items"
        :key="prospect.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/prospects/${prospect.id}`"
          class="record-item-title"
        >
          {{ prospect.name }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ prospectStatusLabel(prospect.status) }}
          · {{ prospect.readiness }}
          <span v-if="prospect.priority === 'high'">
            · High
          </span>
          <span v-if="prospect.city || prospect.state">
            · {{ [prospect.city, prospect.state].filter(Boolean).join(', ') }}
          </span>
          <span v-if="prospect.discipline">
            · {{ prospect.discipline }}
          </span>
          <span v-if="prospect.possibleDuplicateProspectId">
            · Possible duplicate
          </span>
        </p>
        <p class="record-item-meta">
          {{ prospect.website || prospect.email || prospect.phone || 'No public contact yet' }}
        </p>
      </li>
    </ul>
  </section>
</template>
