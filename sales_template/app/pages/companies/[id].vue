<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Company = {
  id: number
  name: string
  notes: string | null
  active: boolean
}
type Contact = { id: number, firstName: string, lastName: string }
type Opportunity = { id: number, name: string, stage: string }
type Activity = { id: number, description: string, status: string, dueAt: string | Date | null }

const { data: company, error, pending, refresh } = await useFetch<Company>(() => `/api/companies/${id.value}`)
const { data: contacts, refresh: refreshContacts } = await useFetch<Contact[]>('/api/contacts', {
  query: computed(() => ({ accountId: String(id.value) })),
})
const { data: opportunities, refresh: refreshOpps } = await useFetch<Opportunity[]>('/api/opportunities', {
  query: computed(() => ({ accountId: String(id.value) })),
})
const { data: activities } = await useFetch<Activity[]>('/api/activities', {
  query: computed(() => ({ accountId: String(id.value), queue: 'open' })),
})

useHead({
  title: computed(() => company.value?.name || 'Company'),
})

const name = ref('')
const notes = ref('')
const active = ref(true)
const saving = ref(false)
const notice = ref('')
const formError = ref('')

watch(company, (value) => {
  if (!value) {
    return
  }
  name.value = value.name
  notes.value = value.notes || ''
  active.value = value.active
}, { immediate: true })

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/companies/${id.value}`, {
      method: 'PATCH',
      body: { name: name.value, notes: notes.value, active: active.value },
    })
    await refresh()
    await refreshContacts()
    await refreshOpps()
    notice.value = 'Saved.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !company">
    <template #header>
      <p class="record-kind">
        Company
      </p>
      <h1 class="record-identity-name">
        {{ company?.name || 'Company' }}
      </h1>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this company.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <form
      v-if="company"
      class="form-measure space-y-4"
      @submit.prevent="save"
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
      <AppField label="Notes">
        <textarea
          v-model="notes"
          class="control"
          rows="3"
        />
      </AppField>
      <label class="touch-row">
        <input
          v-model="active"
          type="checkbox"
        >
        Active
      </label>
      <AppButton
        type="submit"
        :loading="saving"
      >
        Save
      </AppButton>
    </form>
    <template #tabs>
      <div
        v-if="company"
        class="mt-8 grid gap-6 lg:grid-cols-2"
      >
        <AppPanel title="Contacts">
          <ul class="space-y-2 text-sm">
            <li
              v-for="contact in contacts"
              :key="contact.id"
            >
              <NuxtLink :to="`/contacts/${contact.id}`">
                {{ contact.firstName }} {{ contact.lastName }}
              </NuxtLink>
            </li>
          </ul>
          <p
            v-if="!contacts?.length"
            class="text-sm text-muted"
          >
            No contacts yet.
          </p>
          <NuxtLink
            :to="`/contacts?accountId=${id}`"
            class="btn btn-subtle mt-3 text-sm"
          >
            Manage contacts
          </NuxtLink>
        </AppPanel>
        <AppPanel title="Opportunities">
          <ul class="space-y-2 text-sm">
            <li
              v-for="opportunity in opportunities"
              :key="opportunity.id"
            >
              <NuxtLink :to="`/opportunities/${opportunity.id}`">
                {{ opportunity.name }}
              </NuxtLink>
            </li>
          </ul>
          <p
            v-if="!opportunities?.length"
            class="text-sm text-muted"
          >
            No opportunities yet.
          </p>
          <NuxtLink
            :to="`/opportunities?accountId=${id}`"
            class="btn btn-subtle mt-3 text-sm"
          >
            Manage opportunities
          </NuxtLink>
        </AppPanel>
        <AppPanel title="Open activities">
          <ul class="space-y-2 text-sm">
            <li
              v-for="activity in activities"
              :key="activity.id"
            >
              {{ activity.description }}
            </li>
          </ul>
          <p
            v-if="!activities?.length"
            class="text-sm text-muted"
          >
            No open activities.
          </p>
          <NuxtLink
            to="/activities"
            class="btn btn-subtle mt-3 text-sm"
          >
            Activity queue
          </NuxtLink>
        </AppPanel>
        <SalesHistory
          record-kind="company"
          :record-id="company.id"
        />
      </div>
    </template>
  </AppRecordWorkspace>
</template>
