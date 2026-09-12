<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Contacts',
})

type Company = { id: number, name: string }
type Contact = {
  id: number
  accountId: number
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  title: string | null
}

const route = useRoute()
const search = ref('')
const accountId = ref(typeof route.query.accountId === 'string' ? route.query.accountId : '')
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const title = ref('')
const errorMessage = ref('')
const saving = ref(false)

const { data: companies } = await useFetch<Company[]>('/api/companies')
const query = computed(() => ({
  search: search.value || undefined,
  accountId: accountId.value || undefined,
}))
const { data: contacts, error, pending, refresh } = await useFetch<Contact[]>('/api/contacts', { query })

function companyName(id: number) {
  return companies.value?.find(row => row.id === id)?.name || `Company #${id}`
}

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await $fetch<Contact>('/api/contacts', {
      method: 'POST',
      body: {
        accountId: Number(accountId.value),
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value || undefined,
        phone: phone.value || undefined,
        title: title.value || undefined,
      },
    })
    firstName.value = ''
    lastName.value = ''
    email.value = ''
    phone.value = ''
    title.value = ''
    await refresh()
    await navigateTo(`/contacts/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that contact.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Contacts"
      description="People at a Company / Sales Account."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load contacts.' }}
    </AppAlert>
    <AppPanel title="New contact">
      <form
        class="grid gap-3 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AppField
          label="Company"
          required
        >
          <select
            v-model="accountId"
            class="control"
            required
          >
            <option value="">
              Select a company
            </option>
            <option
              v-for="company in companies"
              :key="company.id"
              :value="String(company.id)"
            >
              {{ company.name }}
            </option>
          </select>
        </AppField>
        <AppField label="Title">
          <input
            v-model="title"
            class="control"
          >
        </AppField>
        <AppField
          label="First name"
          required
        >
          <input
            v-model="firstName"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Last name"
          required
        >
          <input
            v-model="lastName"
            class="control"
            required
          >
        </AppField>
        <AppField label="Email">
          <input
            v-model="email"
            type="email"
            class="control"
          >
        </AppField>
        <AppField label="Phone">
          <input
            v-model="phone"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create contact
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <AppField label="Search">
      <input
        v-model="search"
        class="control"
      >
    </AppField>
    <AppEmpty
      v-if="!pending && !contacts?.length"
      title="No contacts yet"
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="contact in contacts"
        :key="contact.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/contacts/${contact.id}`"
          class="record-item-title"
        >
          {{ contact.firstName }} {{ contact.lastName }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ companyName(contact.accountId) }}
          <span v-if="contact.email"> · {{ contact.email }}</span>
        </p>
      </li>
    </ul>
  </section>
</template>
