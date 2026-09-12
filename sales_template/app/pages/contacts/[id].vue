<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

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

const { data: companies } = await useFetch<Company[]>('/api/companies')
const { data: contact, error, pending, refresh } = await useFetch<Contact>(() => `/api/contacts/${id.value}`)

useHead({
  title: computed(() => contact.value ? `${contact.value.firstName} ${contact.value.lastName}` : 'Contact'),
})

const accountId = ref('')
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const title = ref('')
const saving = ref(false)
const notice = ref('')
const formError = ref('')

watch(contact, (value) => {
  if (!value) {
    return
  }
  accountId.value = String(value.accountId)
  firstName.value = value.firstName
  lastName.value = value.lastName
  email.value = value.email || ''
  phone.value = value.phone || ''
  title.value = value.title || ''
}, { immediate: true })

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/contacts/${id.value}`, {
      method: 'PATCH',
      body: {
        accountId: Number(accountId.value),
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        phone: phone.value,
        title: title.value,
      },
    })
    await refresh()
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
  <AppRecordWorkspace :loading="pending && !contact">
    <template #header>
      <p class="record-kind">
        Contact
      </p>
      <h1 class="record-identity-name">
        {{ contact ? `${contact.firstName} ${contact.lastName}` : 'Contact' }}
      </h1>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this contact.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <form
      v-if="contact"
      class="form-measure grid gap-3 sm:grid-cols-2"
      @submit.prevent="save"
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
          Save
        </AppButton>
      </div>
    </form>
  </AppRecordWorkspace>
</template>
