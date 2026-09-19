<script setup lang="ts">
import { COMPANY_LIFECYCLES, companyLifecycleLabel } from '#shared/utils/catalog'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Companies',
})

type Company = {
  id: number
  name: string
  notes: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  active: boolean
  lifecycle: string
}

const search = ref('')
const lifecycle = ref('')
const name = ref('')
const website = ref('')
const phone = ref('')
const city = ref('')
const state = ref('')
const notes = ref('')
const errorMessage = ref('')
const saving = ref(false)

const query = computed(() => ({
  search: search.value || undefined,
  lifecycle: lifecycle.value || undefined,
}))
const { data: companies, error, pending, refresh } = await useFetch<Company[]>('/api/companies', { query })

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await $fetch<Company>('/api/companies', {
      method: 'POST',
      body: {
        name: name.value,
        website: website.value || undefined,
        phone: phone.value || undefined,
        city: city.value || undefined,
        state: state.value || undefined,
        notes: notes.value || undefined,
      },
    })
    name.value = ''
    website.value = ''
    phone.value = ''
    city.value = ''
    state.value = ''
    notes.value = ''
    await refresh()
    await navigateTo(`/companies/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that company.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Companies"
      description="Start outbound academies here: Company → Contacts → Opportunity. This is not a Control Plane customer. Leads are for inbound interest."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load companies.' }}
    </AppAlert>
    <AppPanel title="New company">
      <form
        class="grid gap-3 sm:grid-cols-2"
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
        <AppField label="Website">
          <input
            v-model="website"
            class="control"
          >
        </AppField>
        <AppField label="Phone">
          <input
            v-model="phone"
            class="control"
          >
        </AppField>
        <AppField label="City">
          <input
            v-model="city"
            class="control"
          >
        </AppField>
        <AppField label="State / region">
          <input
            v-model="state"
            class="control"
          >
        </AppField>
        <AppField label="Notes">
          <input
            v-model="notes"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create company
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <div class="grid gap-3 sm:grid-cols-2">
      <AppField label="Search">
        <input
          v-model="search"
          class="control"
          placeholder="Filter by name"
        >
      </AppField>
      <AppField label="Lifecycle">
        <select
          v-model="lifecycle"
          class="control"
        >
          <option value="">
            All
          </option>
          <option
            v-for="code in COMPANY_LIFECYCLES"
            :key="code"
            :value="code"
          >
            {{ companyLifecycleLabel(code) }}
          </option>
        </select>
      </AppField>
    </div>
    <p
      v-if="pending && !companies"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <AppEmpty
      v-else-if="!companies?.length"
      title="No companies yet"
      description="Create a company to start outbound pursuit."
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="company in companies"
        :key="company.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/companies/${company.id}`"
          class="record-item-title"
        >
          {{ company.name }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ companyLifecycleLabel(company.lifecycle) }}
          · {{ company.active ? 'Active' : 'Inactive' }}
          <span v-if="company.city || company.state">
            · {{ [company.city, company.state].filter(Boolean).join(', ') }}
          </span>
        </p>
      </li>
    </ul>
  </section>
</template>
